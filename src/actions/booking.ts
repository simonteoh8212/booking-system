"use server";

import { prisma } from "@/lib/prisma";
import {
  generateReferenceCode,
  toBusinessDateString,
  createBusinessDateTime,
} from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { headers } from "next/headers";
import {
  checkRateLimit,
  recordFailedLookup,
  recordSuccessfulLookup,
} from "@/lib/rate-limit";
import {
  getBookingFromCache,
  saveBookingToCache,
  invalidateBookingCache,
} from "@/lib/booking-cache";
import {
  DEFAULT_DUITNOW_PAYLOAD,
  generateDuitNowQRDataUrl,
} from "@/lib/duitnow";
import type {
  ActionResult,
  BookingConfirmation,
  CustomerBookingLookupDto,
  TimeSlot,
} from "@/types";
import { addMinutes, areIntervalsOverlapping, subMinutes } from "date-fns";

// Slot granularity in minutes (every 15 min)
const SLOT_INTERVAL = 15;
const HOLD_DURATION_MINUTES = 7;

// ----------------------------------------------------------------
// getAvailableSlots
// ----------------------------------------------------------------
export async function getAvailableSlots(
  dateInput: string,
  serviceDurationMinutes: number
): Promise<ActionResult<TimeSlot[]>> {
  try {
    // 0. Auto-release stale unsubmitted PENDING holds older than 7 minutes
    // (Note: bookings where receiptSubmittedAt is set are NEVER auto-cancelled)
    const holdCutoff = subMinutes(new Date(), HOLD_DURATION_MINUTES);
    await prisma.booking.updateMany({
      where: {
        status: "PENDING",
        receiptSubmittedAt: null,
        createdAt: { lt: holdCutoff },
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

    // 5. Fetch blockouts that overlap with this day
    const blockouts = await prisma.timeBlockout.findMany({
      where: {
        startDatetime: { lte: endOfDay },
        endDatetime: { gte: startOfDay },
      },
      select: { startDatetime: true, endDatetime: true },
    });

    // 6. Build busy intervals
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

    // 7. Generate candidate start times at SLOT_INTERVAL increments
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
// createBookingHold (Stage 1: Hold slot for 7 minutes)
// ----------------------------------------------------------------
interface CreateBookingInput {
  serviceId: string;
  startDatetimeIso: string;
  customerName: string;
  phoneNumber: string;
  notes?: string;
}

export async function createBookingHold(
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

    // Check deposit configuration
    const depositSetting = await prisma.depositSetting.findUnique({
      where: { id: "default" },
    });

    let depositDueCents: number | null = null;
    let balanceDueCents: number | null = null;

    if (depositSetting?.isEnabled) {
      if (depositSetting.type === "PERCENTAGE") {
        depositDueCents = Math.round((service.priceCents * depositSetting.percentage) / 100);
      } else {
        depositDueCents = Math.min(depositSetting.amountCents, service.priceCents);
      }
      depositDueCents = Math.max(100, depositDueCents);
      balanceDueCents = Math.max(0, service.priceCents - depositDueCents);
    }

    // Re-validate slot availability inside transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock to serialize concurrent reservation attempts
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('booking_reservation_lock'))`;

      // 2. Auto-release expired unsubmitted PENDING holds (older than 7 minutes)
      const holdCutoff = subMinutes(new Date(), HOLD_DURATION_MINUTES);
      await tx.booking.updateMany({
        where: {
          status: "PENDING",
          receiptSubmittedAt: null,
          createdAt: { lt: holdCutoff },
        },
        data: { status: "CANCELLED" },
      });

      // 3. Upsert customer by phone number
      const customer = await tx.customer.upsert({
        where: { phoneNumber },
        update: { name: customerName },
        create: { name: customerName, phoneNumber },
      });

      // 4. Invalidate any previous unsubmitted holds for THIS customer (prevents 1 user locking multiple slots)
      await tx.booking.updateMany({
        where: {
          customerId: customer.id,
          status: "PENDING",
          receiptSubmittedAt: null,
        },
        data: { status: "CANCELLED" },
      });

      // 5. Check for overlapping active bookings
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

      // Generate unique reference code (retry on collision)
      let referenceCode = generateReferenceCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await tx.booking.findUnique({ where: { referenceCode } });
        if (!existing) break;
        referenceCode = generateReferenceCode();
        attempts++;
      }

      // Create the booking with PENDING status and receiptSubmittedAt: null (7-min hold)
      const booking = await tx.booking.create({
        data: {
          referenceCode,
          customerId: customer.id,
          serviceId: service.id,
          startDatetime,
          endDatetime,
          totalPriceCents: service.priceCents,
          depositDueCents,
          balanceDueCents,
          status: "PENDING",
          notes: notes ?? null,
          receiptSubmittedAt: null,
        },
      });

      return { booking, customer, service };
    });

    const holdExpiresAt = addMinutes(result.booking.createdAt, HOLD_DURATION_MINUTES);

    const amountToPayCents =
      result.booking.depositDueCents != null && result.booking.depositDueCents > 0
        ? result.booking.depositDueCents
        : result.booking.totalPriceCents;

    let paymentQrDataUrl: string | null = null;
    try {
      paymentQrDataUrl = await generateDuitNowQRDataUrl({
        basePayload: depositSetting?.duitnowPayload || DEFAULT_DUITNOW_PAYLOAD,
        amountCents: amountToPayCents,
        referenceCode: result.booking.referenceCode,
      });
    } catch (qrErr) {
      console.error("[createBookingHold] Failed to generate dynamic QR:", qrErr);
    }

    const whatsappUrl = buildWhatsAppUrl({
      referenceCode: result.booking.referenceCode,
      serviceName: result.service.name,
      startDatetime: result.booking.startDatetime,
      customerName: result.customer.name,
      totalPriceCents: result.booking.totalPriceCents,
      depositDueCents: result.booking.depositDueCents,
      balanceDueCents: result.booking.balanceDueCents,
    });

    const confirmation: BookingConfirmation = {
      referenceCode: result.booking.referenceCode,
      serviceName: result.service.name,
      startDatetime: result.booking.startDatetime.toISOString(),
      endDatetime: result.booking.endDatetime.toISOString(),
      customerName: result.customer.name,
      totalPriceCents: result.booking.totalPriceCents,
      depositDueCents: result.booking.depositDueCents,
      balanceDueCents: result.booking.balanceDueCents,
      paymentQrDataUrl,
      recipientName: depositSetting?.recipientName || "Merchant",
      whatsappUrl,
      holdExpiresAt: holdExpiresAt.toISOString(),
    };

    return { success: true, data: confirmation };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLOT_TAKEN") {
        return {
          success: false,
          error:
            "This time slot was just selected by someone else. Please choose another slot.",
        };
      }
      if (error.message === "SLOT_BLOCKED") {
        return {
          success: false,
          error: "This time slot is not available. Please choose another slot.",
        };
      }
    }
    console.error("[createBookingHold]", error);
    return { success: false, error: "Failed to hold slot. Please try again." };
  }
}

// Backwards compatibility alias
export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<BookingConfirmation>> {
  return createBookingHold(input);
}

// ----------------------------------------------------------------
// confirmBookingReceipt (Stage 2: Customer submitted receipt — permanently locked)
// ----------------------------------------------------------------
export async function confirmBookingReceipt(
  referenceCode: string
): Promise<ActionResult<BookingConfirmation>> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { referenceCode },
      include: { customer: true, service: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.status === "CANCELLED") {
      return {
        success: false,
        error:
          "Your 7-minute slot reservation expired. Please pick another slot.",
      };
    }

    // Mark receipt as submitted — this locks the slot permanently until admin reviews
    const updated = await prisma.booking.update({
      where: { referenceCode },
      data: {
        receiptSubmittedAt: new Date(),
      },
      include: { customer: true, service: true },
    });

    // Invalidate any existing cached status for this booking
    invalidateBookingCache(updated.referenceCode, updated.customer.phoneNumber);

    const whatsappUrl = buildWhatsAppUrl({
      referenceCode: updated.referenceCode,
      serviceName: updated.service.name,
      startDatetime: updated.startDatetime,
      customerName: updated.customer.name,
      totalPriceCents: updated.totalPriceCents,
      depositDueCents: updated.depositDueCents,
      balanceDueCents: updated.balanceDueCents,
    });

    return {
      success: true,
      data: {
        referenceCode: updated.referenceCode,
        serviceName: updated.service.name,
        startDatetime: updated.startDatetime.toISOString(),
        endDatetime: updated.endDatetime.toISOString(),
        customerName: updated.customer.name,
        totalPriceCents: updated.totalPriceCents,
        depositDueCents: updated.depositDueCents,
        balanceDueCents: updated.balanceDueCents,
        whatsappUrl,
      },
    };
  } catch (error) {
    console.error("[confirmBookingReceipt]", error);
    return { success: false, error: "Failed to confirm receipt submission." };
  }
}

async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = headersList.get("x-real-ip");
    if (realIp) return realIp.trim();
    const cfIp = headersList.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
  } catch {
    // Fallback if headers are not available
  }
  return "127.0.0.1";
}

// ----------------------------------------------------------------
// lookupBookingStatus (Public customer booking tracker - Bot & Rate Protected)
// ----------------------------------------------------------------
export async function lookupBookingStatus(
  query: string,
  honeypot?: string
): Promise<ActionResult<CustomerBookingLookupDto>> {
  try {
    // 1. Bot Trap (Honeypot check)
    // Automated crawlers blindly fill all input fields; human browsers leave this empty.
    if (honeypot && honeypot.trim().length > 0) {
      console.warn("[lookupBookingStatus] Bot trapped via honeypot field");
      return {
        success: false,
        error: "Invalid request detected.",
      };
    }

    // 2. IP Rate Limiting (Max 6 attempts per minute per IP)
    const clientIp = await getClientIp();
    const rateCheck = checkRateLimit(`status:${clientIp}`, 6, 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many lookup attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      };
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return {
        success: false,
        error: "Please enter your booking reference code or phone number.",
      };
    }

    if (trimmed.length > 35) {
      return {
        success: false,
        error: "Invalid search query length.",
      };
    }

    // 3. Strict Input Format Validation
    // Valid reference format: e.g. BK-8F29A, SPA-12345 (2-10 prefix chars, hyphen, 4-8 suffix chars)
    const isRefCode = /^[a-zA-Z0-9]{2,10}-[a-zA-Z0-9]{4,8}$/i.test(trimmed);

    // Valid phone format: 9 to 14 digits (e.g. 0123456789, 60123456789)
    const cleanPhone = trimmed.replace(/\D/g, "");
    const isPhone = cleanPhone.length >= 9 && cleanPhone.length <= 14;

    // Reject invalid formats immediately BEFORE touching the database!
    if (!isRefCode && !isPhone) {
      return {
        success: false,
        error:
          "Please enter a valid reference code (e.g. BK-XXXXX) or your full registered phone number (minimum 9 digits).",
      };
    }

    // 4. Check Backend Cache First (0ms DB load, instant response)
    const cached = getBookingFromCache(trimmed);
    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    let booking = null;

    // 5. Search by Reference Code in Database
    if (isRefCode) {
      booking = await prisma.booking.findFirst({
        where: {
          referenceCode: {
            equals: trimmed,
            mode: "insensitive",
          },
        },
        include: {
          customer: true,
          service: true,
        },
      });
    }

    // 6. If not found by reference code and input qualifies as phone number
    if (!booking && isPhone) {
      booking = await prisma.booking.findFirst({
        where: {
          customer: {
            phoneNumber: {
              contains: cleanPhone,
            },
          },
        },
        include: {
          customer: true,
          service: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // 7. Track Failed Attempts against Brute-Force Attacks
    if (!booking) {
      recordFailedLookup(`status:${clientIp}`);
      return {
        success: false,
        error:
          "No booking found matching that reference code or phone number. Please check and try again.",
      };
    }

    // Reset strike counter on successful lookup
    recordSuccessfulLookup(`status:${clientIp}`);

    const whatsappUrl = buildWhatsAppUrl({
      referenceCode: booking.referenceCode,
      serviceName: booking.service.name,
      startDatetime: booking.startDatetime,
      customerName: booking.customer.name,
      totalPriceCents: booking.totalPriceCents,
      depositDueCents: booking.depositDueCents,
      balanceDueCents: booking.balanceDueCents,
    });

    const phone = booking.customer.phoneNumber;
    const maskedPhone =
      phone.length > 4
        ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
        : "****";

    const resultData: CustomerBookingLookupDto = {
      referenceCode: booking.referenceCode,
      status: booking.status,
      receiptSubmittedAt: booking.receiptSubmittedAt
        ? booking.receiptSubmittedAt.toISOString()
        : null,
      serviceName: booking.service.name,
      customerName: booking.customer.name,
      maskedPhone,
      startDatetime: booking.startDatetime.toISOString(),
      endDatetime: booking.endDatetime.toISOString(),
      totalPriceCents: booking.totalPriceCents,
      depositDueCents: booking.depositDueCents,
      balanceDueCents: booking.balanceDueCents,
      whatsappUrl,
    };

    // Store in backend cache for fast subsequent checks!
    saveBookingToCache(resultData, booking.customer.phoneNumber);

    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("[lookupBookingStatus]", error);
    return {
      success: false,
      error: "Failed to look up booking. Please try again.",
    };
  }
}

