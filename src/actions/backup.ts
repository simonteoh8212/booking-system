"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import type { ActionResult } from "@/types";

export interface DatabaseBackupStats {
  servicesCount: number;
  customersCount: number;
  bookingsCount: number;
  expensesCount: number;
  totalRecords: number;
  lastCalculatedAt: string;
}

export async function getDatabaseBackupStats(): Promise<ActionResult<DatabaseBackupStats>> {
  await requireAdmin();

  try {
    const [
      servicesCount,
      schedulesCount,
      blockoutsCount,
      customersCount,
      bookingsCount,
      bookingItemsCount,
      adminUsersCount,
      depositSettingsCount,
      exemptCustomersCount,
      expensesCount,
    ] = await Promise.all([
      prisma.service.count(),
      prisma.businessSchedule.count(),
      prisma.timeBlockout.count(),
      prisma.customer.count(),
      prisma.booking.count(),
      prisma.bookingItem.count(),
      prisma.adminUser.count(),
      prisma.depositSetting.count(),
      prisma.depositExemptCustomer.count(),
      prisma.expense.count(),
    ]);

    const totalRecords =
      servicesCount +
      schedulesCount +
      blockoutsCount +
      customersCount +
      bookingsCount +
      bookingItemsCount +
      adminUsersCount +
      depositSettingsCount +
      exemptCustomersCount +
      expensesCount;

    return {
      success: true,
      data: {
        servicesCount,
        customersCount,
        bookingsCount,
        expensesCount,
        totalRecords,
        lastCalculatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[getDatabaseBackupStats]", error);
    return { success: false, error: "Failed to load database backup statistics." };
  }
}
