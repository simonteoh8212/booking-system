"use server";

import { prisma } from "@/lib/prisma";
import {
  generateReferenceCode,
  toBusinessDateString,
  createBusinessDateTime,
} from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type {
  ActionResult,
  BookingConfirmation,
  TimeSlot,
} from "@/types";
import { addMinutes, areIntervalsOverlapping, subMinutes } from "date-fns";

// Slot granularity in minutes (every 15 min)
const SLOT_INTERVAL = 15;

// ----------------------------------------------------------------
// getAvailableSlots
// ----------------------------------------------------------------
export async function getAvailableSlots(
  dateInput: string,
  serviceDurationMinutes: number
): Promise<ActionResult<TimeSlot[]>> {
  try {
    // 0. Auto-release stale PENDING bookings older than 30 minutes
    const thirtyMinutesAgo = subMinutes(new Date(), 30);
    await prisma.booking.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: thirtyMinutesAgo },
      },
      data: { status: "CANCELLED" },
    });

    // 1. Resolve calendar date in business timezone (+08:00)
    const dateStr = toBusinessDateString(dateInput);
    const dayRef = createBusinessDateTime(dateStr, "12:00");
    const dayOfWeek = dayRef.getDay(); // 0-6

    // 2. Check business schedule for this day
    const schedule = await prisma.businessSchedule.findUnique({
      where: { dayOfWeek },
    });

    if (!schedule || schedule.isClosed) {
      return { success: true, data: [] };
    }

    // 3. Compute the business open/close window for this date
    const dayOpen = createBusinessDateTime(dateStr, schedule.openTime);
    const dayClose = createBusinessDateTime(dateStr, schedule.closeTime);

    // 4. Fetch active bookings that overlap with this full business day
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    const existingBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startDatetime: { lte: endOfDay },
        endDatetime: { gte: startOfDay },
      },
      select: { startDatetime: true, endDatetime: true },
    });

    // 4. Fetch blockouts that overlap with this day
    const blockouts = await prisma.timeBlockout.findMany({
      where: {
        startDatetime: { lte: endOfDay },
        endDatetime: { gte: startOfDay },
      },
      select: { startDatetime: true, endDatetime: true },
    });

    // 5. Build busy intervals
    const busyIntervals = [
      ...existingBookings.map((b) => ({
        start: b.startDatetime,
        end: b.endDatetime,
      })),
      ...blockouts.map((b) => ({
        start: b.startDatetime,
        end: b.endDatetime,
      })),
    ];

    // 6. Generate candidate start times at SLOT_INTERVAL increments
    const slots: TimeSlot[] = [];
    let cursor = new Date(dayOpen);

    while (true) {
      const slotEnd = addMinutes(cursor, serviceDurationMinutes);

      // Stop if the slot would run past business close
      if (slotEnd > dayClose) break;

      // Check the slot doesn't overlap with any busy interval
      const isFree = !busyIntervals.some((busy) =>
        areIntervalsOverlapping(
          { start: cursor, end: slotEnd },
          { start: busy.start, end: busy.end },
          { inclusive: false }
        )
      );

      // Also ensure the slot is in the future (with 15-min buffer)
      const isInFuture = cursor > addMinutes(new Date(), 15);

      if (isFree && isInFuture) {
        slots.push({
          startTime: cursor.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }

      cursor = addMinutes(cursor, SLOT_INTERVAL);
    }

    return { success: true, data: slots };
  } catch (error) {
    console.error("[getAvailableSlots]", error);
    return { success: false, error: "Failed to fetch available slots." };
  }
}

// ----------------------------------------------------------------
// createBooking
// ----------------------------------------------------------------
interface CreateBookingInput {
  serviceId: string;
  startDatetimeIso: string;
  customerName: string;
  phoneNumber: string;
  notes?: string;
}

export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<BookingConfirmation>> {
  const { serviceId, startDatetimeIso, customerName, phoneNumber, notes } = input;

  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      return { success: false, error: "Service not found or inactive." };
    }

    const startDatetime = new Date(startDatetimeIso);
    const endDatetime = addMinutes(startDatetime, service.durationMinutes);

    // Re-validate slot availability inside transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock to serialize concurrent reservation attempts
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('booking_reservation_lock'))`;

      // 2. Auto-release stale PENDING bookings older than 30 minutes
      const thirtyMinutesAgo = subMinutes(new Date(), 30);
      await tx.booking.updateMany({
        where: {
          status: "PENDING",
          createdAt: { lt: thirtyMinutesAgo },
        },
        data: { status: "CANCELLED" },
      });

      // 3. Check for overlapping bookings
      const conflict = await tx.booking.findFirst({
        where: {
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          AND: [
            { startDatetime: { lt: endDatetime } },
            { endDatetime: { gt: startDatetime } },
          ],
        },
      });

      if (conflict) {
        throw new Error("SLOT_TAKEN");
      }

      // Check for overlapping blockouts
      const blockout = await tx.timeBlockout.findFirst({
        where: {
          AND: [
            { startDatetime: { lt: endDatetime } },
            { endDatetime: { gt: startDatetime } },
          ],
        },
      });

      if (blockout) {
        throw new Error("SLOT_BLOCKED");
      }

      // Upsert customer by phone number
      const customer = await tx.customer.upsert({
        where: { phoneNumber },
        update: { name: customerName },
        create: { name: customerName, phoneNumber },
      });

      // Generate unique reference code (retry on collision)
      let referenceCode = generateReferenceCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await tx.booking.findUnique({ where: { referenceCode } });
        if (!existing) break;
        referenceCode = generateReferenceCode();
        attempts++;
      }

      // Create the booking (PENDING status — slot is now locked)
      const booking = await tx.booking.create({
        data: {
          referenceCode,
          customerId: customer.id,
          serviceId: service.id,
          startDatetime,
          endDatetime,
          totalPriceCents: service.priceCents,
          status: "PENDING",
          notes: notes ?? null,
        },
      });

      return { booking, customer, service };
    });

    const whatsappUrl = buildWhatsAppUrl({
      referenceCode: result.booking.referenceCode,
      serviceName: result.service.name,
      startDatetime: result.booking.startDatetime,
      customerName: result.customer.name,
      totalPriceCents: result.booking.totalPriceCents,
    });

    const confirmation: BookingConfirmation = {
      referenceCode: result.booking.referenceCode,
      serviceName: result.service.name,
      startDatetime: result.booking.startDatetime.toISOString(),
      endDatetime: result.booking.endDatetime.toISOString(),
      customerName: result.customer.name,
      totalPriceCents: result.booking.totalPriceCents,
      whatsappUrl,
    };

    return { success: true, data: confirmation };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLOT_TAKEN") {
        return {
          success: false,
          error:
            "This time slot was just booked by someone else. Please select another slot.",
        };
      }
      if (error.message === "SLOT_BLOCKED") {
        return {
          success: false,
          error: "This time slot is not available. Please select another slot.",
        };
      }
    }
    console.error("[createBooking]", error);
    return { success: false, error: "Failed to create booking. Please try again." };
  }
}
