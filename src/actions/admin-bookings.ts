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

export type BookingTimeframe = "30_DAYS" | "6_MONTHS" | "THIS_YEAR" | "ALL_TIME";

function getTimeframeStartDate(timeframe: BookingTimeframe): Date | null {
  const now = new Date();
  if (timeframe === "30_DAYS") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (timeframe === "6_MONTHS") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d;
  }
  if (timeframe === "THIS_YEAR") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

export interface BookingsCountsSummary {
  all: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

// ----------------------------------------------------------------
// Get all bookings (admin, paginated & filtered)
// ----------------------------------------------------------------
export async function getAllBookings(opts?: {
  page?: number;
  status?: BookingStatus | "ALL";
  search?: string;
  pageSize?: number;
  timeframe?: BookingTimeframe;
}): Promise<
  ActionResult<{
    bookings: BookingDto[];
    total: number;
    counts: BookingsCountsSummary;
    timeframe: BookingTimeframe;
  }>
> {
  await requireAdmin();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 100;
  const timeframe = opts?.timeframe ?? "6_MONTHS";
  const hasSearch = Boolean(opts?.search && opts.search.trim());

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [];

    if (opts?.status && opts.status !== "ALL") {
      andConditions.push({ status: opts.status });
    }

    if (hasSearch) {
      const q = opts!.search!.trim();
      andConditions.push({
        OR: [
          { referenceCode: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
          { customer: { phoneNumber: { contains: q } } },
          { service: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
      // Smart Universal Search: When user is actively searching, search All-Time
      // unless an explicit non-default timeframe is selected
      if (opts?.timeframe && opts.timeframe !== "6_MONTHS" && opts.timeframe !== "ALL_TIME") {
        const startDate = getTimeframeStartDate(opts.timeframe);
        if (startDate) {
          andConditions.push({ startDatetime: { gte: startDate } });
        }
      }
    } else {
      // Normal browsing: limit to timeframe (default: past 6 months)
      const startDate = getTimeframeStartDate(timeframe);
      if (startDate) {
        andConditions.push({ startDatetime: { gte: startDate } });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [
      bookings,
      total,
      allCount,
      pendingCount,
      confirmedCount,
      completedCount,
      cancelledCount,
      noShowCount,
    ] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { startDatetime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.count({ where: { status: "NO_SHOW" } }),
    ]);

    return {
      success: true,
      data: {
        bookings: bookings.map(toDto),
        total,
        timeframe,
        counts: {
          all: allCount,
          pending: pendingCount,
          confirmed: confirmedCount,
          completed: completedCount,
          cancelled: cancelledCount,
          noShow: noShowCount,
        },
      },
    };
  } catch (error) {
    console.error("[getAllBookings]", error);
    return { success: false, error: "Failed to fetch bookings." };
  }
}

// ----------------------------------------------------------------
// Get pending bookings summary for notification badge
// ----------------------------------------------------------------
export interface PendingBookingItemSummary {
  id: string;
  referenceCode: string;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  startDatetime: string;
  totalPriceCents: number;
  depositDueCents: number | null;
  receiptSubmittedAt: string | null;
  createdAt: string;
}

export async function getPendingBookingsSummary(): Promise<
  ActionResult<{ count: number; bookings: PendingBookingItemSummary[] }>
> {
  await requireAdmin();
  try {
    const [count, bookings] = await Promise.all([
      prisma.booking.count({
        where: { status: "PENDING" },
      }),
      prisma.booking.findMany({
        where: { status: "PENDING" },
        include: {
          customer: { select: { name: true, phoneNumber: true } },
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    return {
      success: true,
      data: {
        count,
        bookings: bookings.map((b) => ({
          id: b.id,
          referenceCode: b.referenceCode,
          customerName: b.customer.name,
          phoneNumber: b.customer.phoneNumber,
          serviceName: b.service.name,
          startDatetime: b.startDatetime.toISOString(),
          totalPriceCents: b.totalPriceCents,
          depositDueCents: b.depositDueCents,
          receiptSubmittedAt: b.receiptSubmittedAt ? b.receiptSubmittedAt.toISOString() : null,
          createdAt: b.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("[getPendingBookingsSummary]", error);
    return { success: false, error: "Failed to fetch pending bookings." };
  }
}
