"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import { toBusinessDateString, createBusinessDateTime } from "@/lib/utils";
import type { ActionResult, BookingDto } from "@/types";

export interface RushModeStatus {
  isActive: boolean;
  expiresAt: string | null;
  reason: string | null;
  minutesRemaining: number;
}

const RUSH_MODE_PREFIX = "RUSH_MODE:";
const EMERGENCY_CLOSURE_PREFIX = "EMERGENCY_CLOSURE:";

// ---------------------------------------------------------------------------
// 1. Get current Rush Mode status
// ---------------------------------------------------------------------------
export async function getRushModeStatus(): Promise<ActionResult<RushModeStatus>> {
  try {
    const now = new Date();
    const activeBlockout = await prisma.timeBlockout.findFirst({
      where: {
        reason: { startsWith: RUSH_MODE_PREFIX },
        endDatetime: { gt: now },
      },
      orderBy: { endDatetime: "desc" },
    });

    if (!activeBlockout) {
      return {
        success: true,
        data: {
          isActive: false,
          expiresAt: null,
          reason: null,
          minutesRemaining: 0,
        },
      };
    }

    const minutesRemaining = Math.max(
      0,
      Math.round((activeBlockout.endDatetime.getTime() - now.getTime()) / (60 * 1000))
    );

    return {
      success: true,
      data: {
        isActive: true,
        expiresAt: activeBlockout.endDatetime.toISOString(),
        reason: activeBlockout.reason?.replace(RUSH_MODE_PREFIX, "").trim() || "Walk-in Rush Hour",
        minutesRemaining,
      },
    };
  } catch (error) {
    console.error("[getRushModeStatus]", error);
    return {
      success: false,
      error: "Failed to check Rush Mode status",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Enable Rush Mode (auto-expiring blockout)
// ---------------------------------------------------------------------------
export async function enableRushMode(
  durationMinutes: number,
  customReason?: string
): Promise<ActionResult<RushModeStatus>> {
  await requireAdmin();
  try {
    const now = new Date();
    const endDatetime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const reasonText = `${RUSH_MODE_PREFIX} ${customReason || "Walk-in Peak Hours"}`;

    // Clear any previous active rush mode blockouts first to avoid stacking
    await prisma.timeBlockout.deleteMany({
      where: {
        reason: { startsWith: RUSH_MODE_PREFIX },
      },
    });

    const blockout = await prisma.timeBlockout.create({
      data: {
        startDatetime: now,
        endDatetime,
        reason: reasonText,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");

    return {
      success: true,
      data: {
        isActive: true,
        expiresAt: blockout.endDatetime.toISOString(),
        reason: customReason || "Walk-in Peak Hours",
        minutesRemaining: durationMinutes,
      },
    };
  } catch (error) {
    console.error("[enableRushMode]", error);
    return { success: false, error: "Failed to enable Rush Mode" };
  }
}

// ---------------------------------------------------------------------------
// 3. Disable Rush Mode (immediately resume normal booking)
// ---------------------------------------------------------------------------
export async function disableRushMode(): Promise<ActionResult<{ success: boolean }>> {
  await requireAdmin();
  try {
    await prisma.timeBlockout.deleteMany({
      where: {
        reason: { startsWith: RUSH_MODE_PREFIX },
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("[disableRushMode]", error);
    return { success: false, error: "Failed to disable Rush Mode" };
  }
}

// ---------------------------------------------------------------------------
// 4. Get all active bookings for an emergency day
// ---------------------------------------------------------------------------
export interface EmergencyDayBookingItem {
  id: string;
  referenceCode: string;
  status: string;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  startDatetime: string;
  endDatetime: string;
  totalPriceCents: number;
  depositDueCents: number | null;
}

export async function getEmergencyDayBookings(
  dateIso: string
): Promise<
  ActionResult<{
    date: string;
    isDayBlocked: boolean;
    blockoutReason: string | null;
    bookings: EmergencyDayBookingItem[];
  }>
> {
  await requireAdmin();
  try {
    const dateStr = toBusinessDateString(dateIso);
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    const [bookings, existingBlockout] = await Promise.all([
      prisma.booking.findMany({
        where: {
          startDatetime: { lte: endOfDay },
          endDatetime: { gte: startOfDay },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: {
          customer: { select: { name: true, phoneNumber: true } },
          service: { select: { name: true } },
        },
        orderBy: { startDatetime: "asc" },
      }),
      prisma.timeBlockout.findFirst({
        where: {
          startDatetime: { lte: endOfDay },
          endDatetime: { gte: startOfDay },
          reason: { startsWith: EMERGENCY_CLOSURE_PREFIX },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        date: dateStr,
        isDayBlocked: !!existingBlockout,
        blockoutReason: existingBlockout?.reason?.replace(EMERGENCY_CLOSURE_PREFIX, "").trim() || null,
        bookings: bookings.map((b) => ({
          id: b.id,
          referenceCode: b.referenceCode,
          status: b.status,
          customerName: b.customer.name,
          phoneNumber: b.customer.phoneNumber,
          serviceName: b.service.name,
          startDatetime: b.startDatetime.toISOString(),
          endDatetime: b.endDatetime.toISOString(),
          totalPriceCents: b.totalPriceCents,
          depositDueCents: b.depositDueCents,
        })),
      },
    };
  } catch (error) {
    console.error("[getEmergencyDayBookings]", error);
    return { success: false, error: "Failed to load bookings for this date" };
  }
}

// ---------------------------------------------------------------------------
// 5. Block the entire day for emergency closure
// ---------------------------------------------------------------------------
export async function blockDayForEmergency(
  dateIso: string,
  reason: string
): Promise<ActionResult<{ success: boolean }>> {
  await requireAdmin();
  try {
    const dateStr = toBusinessDateString(dateIso);
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    // Delete existing emergency blockouts for this date first
    await prisma.timeBlockout.deleteMany({
      where: {
        startDatetime: { lte: endOfDay },
        endDatetime: { gte: startOfDay },
        reason: { startsWith: EMERGENCY_CLOSURE_PREFIX },
      },
    });

    await prisma.timeBlockout.create({
      data: {
        startDatetime: startOfDay,
        endDatetime: endOfDay,
        reason: `${EMERGENCY_CLOSURE_PREFIX} ${reason.trim()}`,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("[blockDayForEmergency]", error);
    return { success: false, error: "Failed to block day" };
  }
}

// ---------------------------------------------------------------------------
// 6. Unblock the emergency closure
// ---------------------------------------------------------------------------
export async function unblockDayEmergency(
  dateIso: string
): Promise<ActionResult<{ success: boolean }>> {
  await requireAdmin();
  try {
    const dateStr = toBusinessDateString(dateIso);
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    await prisma.timeBlockout.deleteMany({
      where: {
        startDatetime: { lte: endOfDay },
        endDatetime: { gte: startOfDay },
        reason: { startsWith: EMERGENCY_CLOSURE_PREFIX },
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("[unblockDayEmergency]", error);
    return { success: false, error: "Failed to unblock day" };
  }
}

// ---------------------------------------------------------------------------
// 7. Batch cancel affected bookings with reason note
// ---------------------------------------------------------------------------
export async function batchCancelEmergencyBookings(
  bookingIds: string[],
  reason: string
): Promise<ActionResult<{ cancelledCount: number }>> {
  await requireAdmin();
  try {
    if (!bookingIds || bookingIds.length === 0) {
      return { success: true, data: { cancelledCount: 0 } };
    }

    const res = await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      data: {
        status: "CANCELLED",
        notes: `Emergency cancellation: ${reason}`,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/desk");

    return { success: true, data: { cancelledCount: res.count } };
  } catch (error) {
    console.error("[batchCancelEmergencyBookings]", error);
    return { success: false, error: "Failed to cancel bookings" };
  }
}
