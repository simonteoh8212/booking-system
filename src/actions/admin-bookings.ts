"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import { invalidateBookingCache } from "@/lib/booking-cache";
import type { ActionResult, BookingDto, BookingStatus } from "@/types";

// ----------------------------------------------------------------
// Helper — serialize a DB booking to BookingDto
// ----------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDto(b: any): BookingDto {
  return {
    id: b.id,
    referenceCode: b.referenceCode,
    status: b.status,
    startDatetime: b.startDatetime.toISOString(),
    endDatetime: b.endDatetime.toISOString(),
    totalPriceCents: b.totalPriceCents,
    depositDueCents: b.depositDueCents,
    balanceDueCents: b.balanceDueCents,
    notes: b.notes,
    receiptSubmittedAt: b.receiptSubmittedAt ? b.receiptSubmittedAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    customer: {
      name: b.customer.name,
      phoneNumber: b.customer.phoneNumber,
    },
    service: {
      name: b.service.name,
      durationMinutes: b.service.durationMinutes,
    },
  };
}

const BOOKING_INCLUDE = {
  customer: { select: { name: true, phoneNumber: true } },
  service: { select: { name: true, durationMinutes: true } },
};

// ----------------------------------------------------------------
// Get bookings for a date range (admin)
// ----------------------------------------------------------------
export async function getBookings(
  startIso: string,
  endIso: string
): Promise<ActionResult<BookingDto[]>> {
  await requireAdmin();
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        startDatetime: { gte: new Date(startIso), lte: new Date(endIso) },
      },
      include: BOOKING_INCLUDE,
      orderBy: { startDatetime: "asc" },
    });
    return { success: true, data: bookings.map(toDto) };
  } catch {
    return { success: false, error: "Failed to fetch bookings." };
  }
}

// ----------------------------------------------------------------
// Update booking status (admin)
// ----------------------------------------------------------------
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<ActionResult<BookingDto>> {
  await requireAdmin();
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: BOOKING_INCLUDE,
    });

    // Invalidate customer lookup cache on-demand!
    invalidateBookingCache(booking.referenceCode, booking.customer.phoneNumber);

    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/check-booking");
    return { success: true, data: toDto(booking) };
  } catch {
    return { success: false, error: "Failed to update booking status." };
  }
}

// ----------------------------------------------------------------
// Cancel booking (admin)
// ----------------------------------------------------------------
export async function cancelBooking(
  id: string
): Promise<ActionResult<BookingDto>> {
  return updateBookingStatus(id, "CANCELLED");
}

// ----------------------------------------------------------------
// Get all bookings (admin, paginated)
// ----------------------------------------------------------------
export async function getAllBookings(opts?: {
  page?: number;
  status?: BookingStatus;
}): Promise<ActionResult<{ bookings: BookingDto[]; total: number }>> {
  await requireAdmin();
  const page = opts?.page ?? 1;
  const pageSize = 20;

  try {
    const where = opts?.status ? { status: opts.status } : {};
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { startDatetime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      success: true,
      data: { bookings: bookings.map(toDto), total },
    };
  } catch {
    return { success: false, error: "Failed to fetch bookings." };
  }
}
