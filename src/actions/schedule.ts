"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import type { ActionResult, BusinessScheduleDto, TimeBlockoutDto } from "@/types";

// ----------------------------------------------------------------
// Business hours
// ----------------------------------------------------------------

export async function getBusinessSchedules(): Promise<
  ActionResult<BusinessScheduleDto[]>
> {
  try {
    const schedules = await prisma.businessSchedule.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
    return { success: true, data: schedules };
  } catch {
    return { success: false, error: "Failed to fetch business hours." };
  }
}

export async function upsertBusinessSchedule(
  dayOfWeek: number,
  data: { openTime: string; closeTime: string; isClosed: boolean }
): Promise<ActionResult<BusinessScheduleDto>> {
  await requireAdmin();
  try {
    const schedule = await prisma.businessSchedule.upsert({
      where: { dayOfWeek },
      update: data,
      create: { dayOfWeek, ...data },
    });
    revalidatePath("/admin/settings");
    return { success: true, data: schedule };
  } catch {
    return { success: false, error: "Failed to save business hours." };
  }
}

// ----------------------------------------------------------------
// Time blockouts
// ----------------------------------------------------------------

export async function getTimeBlockouts(): Promise<
  ActionResult<TimeBlockoutDto[]>
> {
  await requireAdmin();
  try {
    const blockouts = await prisma.timeBlockout.findMany({
      orderBy: { startDatetime: "asc" },
    });
    return {
      success: true,
      data: blockouts.map((b) => ({
        ...b,
        startDatetime: b.startDatetime.toISOString(),
        endDatetime: b.endDatetime.toISOString(),
      })),
    };
  } catch {
    return { success: false, error: "Failed to fetch blockouts." };
  }
}

export async function createTimeBlockout(data: {
  startDatetimeIso: string;
  endDatetimeIso: string;
  reason?: string;
}): Promise<ActionResult<TimeBlockoutDto>> {
  await requireAdmin();
  try {
    const blockout = await prisma.timeBlockout.create({
      data: {
        startDatetime: new Date(data.startDatetimeIso),
        endDatetime: new Date(data.endDatetimeIso),
        reason: data.reason,
      },
    });
    revalidatePath("/admin/settings");
    return {
      success: true,
      data: {
        ...blockout,
        startDatetime: blockout.startDatetime.toISOString(),
        endDatetime: blockout.endDatetime.toISOString(),
      },
    };
  } catch {
    return { success: false, error: "Failed to create blockout." };
  }
}

export async function deleteTimeBlockout(
  id: string
): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    await prisma.timeBlockout.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete blockout." };
  }
}
