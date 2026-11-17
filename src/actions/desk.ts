"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { getRequestClientIp, timingSafeSecretEqual } from "@/lib/auth";
import {
  checkRateLimit,
  recordFailedLookup,
  recordSuccessfulLookup,
} from "@/lib/rate-limit";
import {
  toBusinessDateString,
  createBusinessDateTime,
  generateReferenceCode,
} from "@/lib/utils";
import { invalidateBookingCache } from "@/lib/booking-cache";
import { revalidatePath } from "next/cache";
import { getOrEnsurePrimaryDepositSetting } from "./deposit";
import type {
  ActionResult,
  BookingStatus,
  DeskLanguageMode,
  ExpenseCategory,
  ExpenseDto,
  MonthlyFinancialReportDto,
} from "@/types";

export interface ServiceSalesCount {
  serviceId: string;
  serviceName: string;
  category: string | null;
  count: number;
  totalCents: number;
}

export interface DeskDailySummary {
  dateStr: string;
  totalSalesCents: number;
  totalClientsCount: number;
  completedCount: number;
  pendingCount: number;
  yesterdaySalesCents: number;
  yesterdayCompletedCount: number;
  monthSalesCents: number;
  monthCompletedCount: number;
  monthLabel: string;
  currency: string;
  currencySymbol: string;
  deskLanguage: DeskLanguageMode;
  showTodaySales: boolean;
  showYesterdaySales: boolean;
  showMonthlySales: boolean;
  showServiceBreakdown: boolean;
  showMakeAppointment: boolean;
  showWalkIn: boolean;
  showBookedCheckout: boolean;
  servicesBreakdown: ServiceSalesCount[];
}

export interface DeskAppointmentItem {
  id: string;
  referenceCode: string;
  customerId: string;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  startDatetime: string;
  endDatetime: string;
  totalPriceCents: number;
  depositDueCents: number | null;
  balanceDueCents: number | null;
  status: BookingStatus;
  notes: string | null;
}

/**
 * Fetch daily sales summary and service breakdown counts for the given date,
 * including today, yesterday, and current month-to-date sales totals.
 */
export async function getDeskDailySummary(
  targetDateInput?: string
): Promise<ActionResult<DeskDailySummary>> {
  await requireAdmin();

  try {
    const dateStr = targetDateInput || toBusinessDateString(new Date());
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    // Yesterday in business timezone
    const yesterdayDate = new Date(startOfDay.getTime() - 12 * 3600 * 1000);
    const yesterdayDateStr = toBusinessDateString(yesterdayDate);
    const startOfYesterday = createBusinessDateTime(yesterdayDateStr, "00:00");
    const endOfYesterday = new Date(
      createBusinessDateTime(yesterdayDateStr, "23:59").getTime() + 59999
    );

    // Current month in business timezone
    const [yearStr, monthStr] = dateStr.split("-");
    const startOfMonthStr = `${yearStr}-${monthStr}-01`;
    const startOfMonth = createBusinessDateTime(startOfMonthStr, "00:00");
    const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const endOfMonthStr = `${yearStr}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
    const endOfMonth = new Date(
      createBusinessDateTime(endOfMonthStr, "23:59").getTime() + 59999
    );

    const monthDateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const monthLabel = monthDateObj.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    // Fetch deposit settings safely so visibility, currency, and language never fail
    let depositSetting = null;
    try {
      depositSetting = await getOrEnsurePrimaryDepositSetting();
    } catch (settingErr) {
      console.error("[getDeskDailySummary] depositSetting fetch warning:", settingErr);
    }

    // Fetch bookings and member cash reloads/package purchases safely
    let bookings: any[] = [];
    let yesterdayBookings: { totalPriceCents: number }[] = [];
    let monthBookings: { totalPriceCents: number }[] = [];
    let todayMemberSalesCents = 0;
    let yesterdayMemberSalesCents = 0;
    let monthMemberSalesCents = 0;
    try {
      const [
        bToday,
        bYesterday,
        bMonth,
        mToday,
        mYesterday,
        mMonth,
      ] = await Promise.all([
        prisma.booking.findMany({
          where: {
            startDatetime: { gte: startOfDay, lte: endOfDay },
            status: { not: "CANCELLED" },
          },
          include: {
            service: true,
            items: {
              include: { service: true },
            },
          },
          orderBy: { startDatetime: "asc" },
        }),
        prisma.booking.findMany({
          where: {
            startDatetime: { gte: startOfYesterday, lte: endOfYesterday },
            status: "COMPLETED",
          },
          select: { totalPriceCents: true },
        }),
        prisma.booking.findMany({
          where: {
            startDatetime: { gte: startOfMonth, lte: endOfMonth },
            status: "COMPLETED",
          },
          select: { totalPriceCents: true },
        }),
        prisma.memberTransaction.findMany({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            cashPaidCents: { gt: 0 },
          },
          select: { cashPaidCents: true },
        }),
        prisma.memberTransaction.findMany({
          where: {
            createdAt: { gte: startOfYesterday, lte: endOfYesterday },
            cashPaidCents: { gt: 0 },
          },
          select: { cashPaidCents: true },
        }),
        prisma.memberTransaction.findMany({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            cashPaidCents: { gt: 0 },
          },
          select: { cashPaidCents: true },
        }),
      ]);
      bookings = bToday;
      yesterdayBookings = bYesterday;
      monthBookings = bMonth;
      todayMemberSalesCents = mToday.reduce((s, t) => s + t.cashPaidCents, 0);
      yesterdayMemberSalesCents = mYesterday.reduce((s, t) => s + t.cashPaidCents, 0);
      monthMemberSalesCents = mMonth.reduce((s, t) => s + t.cashPaidCents, 0);
    } catch (bookingErr) {
      console.error("[getDeskDailySummary] Bookings query warning:", bookingErr);
    }

    let totalSalesCents = todayMemberSalesCents;
    let completedCount = 0;
    let pendingCount = 0;

    // Service breakdown mapping
    const serviceMap = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        category: string | null;
        count: number;
        totalCents: number;
      }
    >();

    for (const b of bookings) {
      if (b.status === "COMPLETED") {
        totalSalesCents += b.totalPriceCents;
        completedCount++;
      } else if (b.status === "PENDING" || b.status === "CONFIRMED") {
        pendingCount++;
      }

      // Count services (only for active or completed bookings)
      if (b.items && b.items.length > 0) {
        for (const item of b.items) {
          const sid = item.serviceId;
          const existing = serviceMap.get(sid) || {
            serviceId: sid,
            serviceName: item.service.name,
            category: item.service.category,
            count: 0,
            totalCents: 0,
          };
          existing.count += 1;
          existing.totalCents += item.priceCents;
          serviceMap.set(sid, existing);
        }
      } else {
        // Fallback to primary booking service
        const sid = b.serviceId;
        const existing = serviceMap.get(sid) || {
          serviceId: sid,
          serviceName: b.service.name,
          category: b.service.category,
          count: 0,
          totalCents: 0,
        };
        existing.count += 1;
        existing.totalCents += b.totalPriceCents;
        serviceMap.set(sid, existing);
      }
    }

    const servicesBreakdown = Array.from(serviceMap.values()).sort(
      (a, b) => b.count - a.count || b.totalCents - a.totalCents
    );

    const yesterdaySalesCents =
      yesterdayBookings.reduce((sum, b) => sum + b.totalPriceCents, 0) +
      yesterdayMemberSalesCents;
    const yesterdayCompletedCount = yesterdayBookings.length;

    const monthSalesCents =
      monthBookings.reduce((sum, b) => sum + b.totalPriceCents, 0) +
      monthMemberSalesCents;
    const monthCompletedCount = monthBookings.length;

    const currency = "MYR";
    const currencySymbol = "RM";
    const deskLanguage =
      (depositSetting?.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST";
    const showTodaySales = depositSetting?.showTodaySales ?? true;
    const showYesterdaySales = depositSetting?.showYesterdaySales ?? true;
    const showMonthlySales = depositSetting?.showMonthlySales ?? true;
    const showServiceBreakdown = depositSetting?.showServiceBreakdown ?? true;
    const showMakeAppointment = depositSetting?.showMakeAppointment ?? true;
    const showWalkIn = depositSetting?.showWalkIn ?? true;
    const showBookedCheckout = depositSetting?.showBookedCheckout ?? true;

    return {
      success: true,
      data: {
        dateStr,
        totalSalesCents,
        totalClientsCount: bookings.length,
        completedCount,
        pendingCount,
        yesterdaySalesCents,
        yesterdayCompletedCount,
        monthSalesCents,
        monthCompletedCount,
        monthLabel,
        currency,
        currencySymbol,
        deskLanguage,
        showTodaySales,
        showYesterdaySales,
        showMonthlySales,
        showServiceBreakdown,
        showMakeAppointment,
        showWalkIn,
        showBookedCheckout,
        servicesBreakdown,
      },
    };
  } catch (error) {
    console.error("[getDeskDailySummary]", error);
    return { success: false, error: "Failed to calculate daily sales." };
  }
}

/**
 * Get today's appointment checklist
 */
export async function getDeskAppointments(
  targetDateInput?: string
): Promise<ActionResult<DeskAppointmentItem[]>> {
  await requireAdmin();

  try {
    const dateStr = targetDateInput || toBusinessDateString(new Date());
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    const bookings = await prisma.booking.findMany({
      where: {
        startDatetime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: { startDatetime: "asc" },
    });

    const items: DeskAppointmentItem[] = bookings.map((b) => ({
      id: b.id,
      referenceCode: b.referenceCode,
      customerId: b.customerId,
      customerName: b.customer.name,
      phoneNumber: b.customer.phoneNumber,
      serviceName: b.service.name,
      startDatetime: b.startDatetime.toISOString(),
      endDatetime: b.endDatetime.toISOString(),
      totalPriceCents: b.totalPriceCents,
      depositDueCents: b.depositDueCents,
      balanceDueCents: b.balanceDueCents,
      status: b.status,
      notes: b.notes,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("[getDeskAppointments]", error);
    return { success: false, error: "Failed to load appointments." };
  }
}

/**
 * 1-Tap checklist status change (e.g. Arrived -> Completed)
 */
export async function updateDeskAppointmentStatus(
  bookingId: string,
  status: BookingStatus
): Promise<ActionResult<void>> {
  await requireAdmin();

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { customer: true },
    });

    invalidateBookingCache(booking.referenceCode, booking.customer.phoneNumber);
    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateDeskAppointmentStatus]", error);
    return { success: false, error: "Failed to update appointment status." };
  }
}

interface RecordDeskSaleInput {
  type: "APPOINTMENT" | "WALKIN";
  bookingId?: string;
  customerId?: string;
  customerName?: string;
  phoneNumber?: string;
  serviceIds: string[]; // Supports multiple services & products!
  promoRedemptions?: { serviceId: string; memberPackageId: string }[];
  useCreditCents?: number;
  paymentMethod: "CASH" | "DUITNOW_QR" | "CARD";
  notes?: string;
}

/**
 * Record and finalize sales for either an existing appointment or a walk-in client,
 * with full support for Member Promo Session Redemptions and Member Credit deductions.
 */
export async function recordDeskSale(
  input: RecordDeskSaleInput
): Promise<ActionResult<{ referenceCode: string; totalCents: number }>> {
  await requireAdmin();

  try {
    const {
      type,
      bookingId,
      customerId,
      customerName,
      phoneNumber,
      serviceIds,
      promoRedemptions = [],
      useCreditCents = 0,
      paymentMethod,
      notes,
    } = input;

    if (!serviceIds || serviceIds.length === 0) {
      return { success: false, error: "Please select at least one service or product." };
    }

    // Fetch all chosen services/products to calculate accurate price
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    if (services.length === 0) {
      return { success: false, error: "Selected items not found." };
    }

    // Map promo redemptions by serviceId (at most 1 redemption per selected service)
    const promoByServiceId = new Map<string, string>();
    for (const r of promoRedemptions) {
      if (r.serviceId && r.memberPackageId) {
        promoByServiceId.set(r.serviceId, r.memberPackageId);
      }
    }

    const itemLineData = services.map((s) => {
      const redeemedPkgId = promoByServiceId.get(s.id) || null;
      return {
        serviceId: s.id,
        serviceName: s.name,
        originalPriceCents: s.priceCents,
        priceCents: redeemedPkgId ? 0 : s.priceCents,
        memberPackageId: redeemedPkgId,
      };
    });

    const grossSubtotalCents = itemLineData.reduce((acc, it) => acc + it.originalPriceCents, 0);
    const promoDiscountCents = itemLineData.reduce(
      (acc, it) => acc + (it.memberPackageId ? it.originalPriceCents : 0),
      0
    );
    const afterPromoCents = Math.max(0, grossSubtotalCents - promoDiscountCents);

    const result = await prisma.$transaction(async (tx) => {
      let targetCustomer = null;
      let existingBooking = null;

      if (type === "APPOINTMENT" && bookingId) {
        existingBooking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { customer: true },
        });
        if (!existingBooking) {
          throw new Error("Booking not found.");
        }
        targetCustomer = existingBooking.customer;
      } else if (customerId) {
        targetCustomer = await tx.customer.findUnique({ where: { id: customerId } });
      }

      if (!targetCustomer) {
        const cleanPhone = (phoneNumber || "").replace(/\s/g, "");
        const finalName = (customerName || "").trim() || "Walk-in Customer";
        const finalPhone = cleanPhone || `WALKIN-${Date.now()}`;
        targetCustomer = await tx.customer.upsert({
          where: { phoneNumber: finalPhone },
          update: { name: finalName },
          create: { name: finalName, phoneNumber: finalPhone },
        });
      }

      const depositPaidCents =
        existingBooking?.depositDueCents && existingBooking.depositDueCents > 0
          ? existingBooking.depositDueCents
          : 0;
      const balanceBeforeCreditCents = Math.max(0, afterPromoCents - depositPaidCents);

      // Process Promo Session Redemptions
      const redeemedNotes: string[] = [];
      for (const item of itemLineData) {
        if (!item.memberPackageId) continue;
        const pkg = await tx.memberPackage.findUnique({
          where: { id: item.memberPackageId },
        });
        if (!pkg || pkg.customerId !== targetCustomer.id) {
          throw new Error("Invalid member promo package selected.");
        }
        if (pkg.remainingSessions < 1) {
          throw new Error(`No sessions remaining on promo "${pkg.name}".`);
        }
        const nextRemaining = pkg.remainingSessions - 1;
        await tx.memberPackage.update({
          where: { id: pkg.id },
          data: {
            remainingSessions: nextRemaining,
            status: nextRemaining === 0 ? "COMPLETED" : "ACTIVE",
          },
        });
        redeemedNotes.push(`${pkg.name} (-1, ${nextRemaining}/${pkg.totalSessions} left)`);
      }

      // Process Member Credit Deduction
      let actualCreditUsedCents = 0;
      let nextCreditBalance = targetCustomer.creditBalanceCents;
      if (useCreditCents > 0 && balanceBeforeCreditCents > 0) {
        actualCreditUsedCents = Math.min(
          useCreditCents,
          targetCustomer.creditBalanceCents,
          balanceBeforeCreditCents
        );
        if (actualCreditUsedCents > 0) {
          nextCreditBalance = targetCustomer.creditBalanceCents - actualCreditUsedCents;
          await tx.customer.update({
            where: { id: targetCustomer.id },
            data: { creditBalanceCents: nextCreditBalance },
          });
        }
      }

      // Net Cash/QR/Card collected TODAY (stored in totalPriceCents so sales reports never double-count)
      const netCashCollectedCents = Math.max(
        0,
        balanceBeforeCreditCents - actualCreditUsedCents
      );

      const serviceNames = services.map((s) => s.name).join(", ");
      const noteParts: string[] = [];
      if (netCashCollectedCents > 0) {
        noteParts.push(`Paid RM ${(netCashCollectedCents / 100).toFixed(2)} via ${paymentMethod}`);
      } else {
        noteParts.push(`Paid RM 0.00 (Covered by Promo/Credit)`);
      }
      if (actualCreditUsedCents > 0) {
        noteParts.push(`Credit Used: RM ${(actualCreditUsedCents / 100).toFixed(2)}`);
      }
      if (redeemedNotes.length > 0) {
        noteParts.push(`Promo: ${redeemedNotes.join("; ")}`);
      }
      if (notes) {
        noteParts.push(notes);
      }
      const paymentNote = noteParts.join(" | ");

      let finalBookingId = "";
      let finalRefCode = "";

      if (existingBooking) {
        await tx.bookingItem.deleteMany({ where: { bookingId: existingBooking.id } });
        await tx.bookingItem.createMany({
          data: itemLineData.map((it) => ({
            bookingId: existingBooking.id,
            serviceId: it.serviceId,
            priceCents: it.priceCents,
            originalPriceCents: it.originalPriceCents,
            memberPackageId: it.memberPackageId,
          })),
        });

        const updated = await tx.booking.update({
          where: { id: existingBooking.id },
          data: {
            customerId: targetCustomer.id,
            status: "COMPLETED",
            totalPriceCents: netCashCollectedCents,
            creditUsedCents: actualCreditUsedCents,
            promoDiscountCents,
            balanceDueCents: 0,
            notes: existingBooking.notes
              ? `${existingBooking.notes} | ${paymentNote}`
              : paymentNote,
            receiptSubmittedAt: existingBooking.receiptSubmittedAt || new Date(),
          },
        });
        finalBookingId = updated.id;
        finalRefCode = updated.referenceCode;
        invalidateBookingCache(updated.referenceCode, targetCustomer.phoneNumber);
      } else {
        let refCode = generateReferenceCode();
        let attempts = 0;
        while (attempts < 5) {
          const found = await tx.booking.findUnique({ where: { referenceCode: refCode } });
          if (!found) break;
          refCode = generateReferenceCode();
          attempts++;
        }

        const now = new Date();
        const created = await tx.booking.create({
          data: {
            referenceCode: refCode,
            customerId: targetCustomer.id,
            serviceId: services[0].id,
            startDatetime: now,
            endDatetime: now,
            totalPriceCents: netCashCollectedCents,
            depositDueCents: 0,
            balanceDueCents: 0,
            creditUsedCents: actualCreditUsedCents,
            promoDiscountCents,
            status: "COMPLETED",
            notes: `Items: ${serviceNames} | ${paymentNote}`,
            receiptSubmittedAt: now,
            items: {
              create: itemLineData.map((it) => ({
                serviceId: it.serviceId,
                priceCents: it.priceCents,
                originalPriceCents: it.originalPriceCents,
                memberPackageId: it.memberPackageId,
              })),
            },
          },
        });
        finalBookingId = created.id;
        finalRefCode = created.referenceCode;
      }

      // Write MemberTransaction audit entries for any promo or credit deductions
      for (const item of itemLineData) {
        if (!item.memberPackageId) continue;
        const pkgAfter = await tx.memberPackage.findUnique({
          where: { id: item.memberPackageId },
        });
        await tx.memberTransaction.create({
          data: {
            customerId: targetCustomer.id,
            memberPackageId: item.memberPackageId,
            bookingId: finalBookingId,
            type: "PACKAGE_DEDUCT",
            creditChangeCents: 0,
            balanceAfterCents: nextCreditBalance,
            sessionsChange: -1,
            sessionsAfter: pkgAfter?.remainingSessions ?? null,
            cashPaidCents: 0,
            paymentMethod: "PROMO",
            description: `Used 1x ${item.serviceName} from ${pkgAfter?.name || "Promo"} (${finalRefCode})`,
          },
        });
      }

      if (actualCreditUsedCents > 0) {
        await tx.memberTransaction.create({
          data: {
            customerId: targetCustomer.id,
            bookingId: finalBookingId,
            type: "CREDIT_DEDUCT",
            creditChangeCents: -actualCreditUsedCents,
            balanceAfterCents: nextCreditBalance,
            sessionsChange: 0,
            cashPaidCents: 0,
            paymentMethod: "CREDIT",
            description: `Deducted RM ${(actualCreditUsedCents / 100).toFixed(
              2
            )} credit for ${serviceNames} (${finalRefCode})`,
          },
        });
      }

      return { referenceCode: finalRefCode, totalCents: netCashCollectedCents };
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[recordDeskSale]", error);
    const msg = error instanceof Error ? error.message : "Failed to record sale.";
    return { success: false, error: msg };
  }
}

/**
 * 1-Tap Manual Appointment Creation (Directly from Desk)
 */
export async function createDeskAppointment(input: {
  customerName: string;
  phoneNumber: string;
  serviceId: string;
  startDatetimeIso: string;
  notes?: string;
}): Promise<ActionResult<{ referenceCode: string }>> {
  await requireAdmin();

  try {
    const { customerName, phoneNumber, serviceId, startDatetimeIso, notes } = input;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return { success: false, error: "Service not found." };

    const start = new Date(startDatetimeIso);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    const cleanPhone = phoneNumber.replace(/\s/g, "");
    const customer = await prisma.customer.upsert({
      where: { phoneNumber: cleanPhone },
      update: { name: customerName },
      create: { name: customerName, phoneNumber: cleanPhone },
    });

    let refCode = generateReferenceCode();
    let attempts = 0;
    while (attempts < 5) {
      const found = await prisma.booking.findUnique({
        where: { referenceCode: refCode },
      });
      if (!found) break;
      refCode = generateReferenceCode();
      attempts++;
    }

    const booking = await prisma.booking.create({
      data: {
        referenceCode: refCode,
        customerId: customer.id,
        serviceId: service.id,
        startDatetime: start,
        endDatetime: end,
        totalPriceCents: service.priceCents,
        depositDueCents: null,
        balanceDueCents: service.priceCents,
        status: "CONFIRMED",
        notes: notes || null,
        receiptSubmittedAt: new Date(),
        items: {
          create: [{ serviceId: service.id, priceCents: service.priceCents }],
        },
      },
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");

    return { success: true, data: { referenceCode: booking.referenceCode } };
  } catch (error) {
    console.error("[createDeskAppointment]", error);
    return { success: false, error: "Failed to create appointment." };
  }
}

// ----------------------------------------------------------------
// Verify Owner PIN for Desk Financial Module
// ----------------------------------------------------------------
export async function verifyDeskOwnerPin(pin: string): Promise<ActionResult<boolean>> {
  const session = await requireAdmin();
  try {
    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: "Please enter a 4-digit PIN." };
    }

    const clientIp = await getRequestClientIp();
    const rateKey = `desk-pin:${session.sub}:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 6, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many PIN attempts. Please wait ${rateCheck.retryAfterSeconds}s.`,
      };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    if (!admin) return { success: false, error: "No admin user found." };
    if (!admin.pinCode) {
      return {
        success: false,
        error: "Passcode PIN is not configured. Please set one in Settings.",
      };
    }

    if (!timingSafeSecretEqual(cleanPin, admin.pinCode)) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Incorrect PIN code. / 密码错误" };
    }

    recordSuccessfulLookup(rateKey);
    return { success: true, data: true };
  } catch (error) {
    console.error("[verifyDeskOwnerPin]", error);
    return { success: false, error: "Failed to verify PIN." };
  }
}

// ----------------------------------------------------------------
// Fetch Monthly Financial & Net Profit Report
// ----------------------------------------------------------------
export async function getMonthlyFinancialReport(
  targetYear?: number,
  targetMonth?: number
): Promise<ActionResult<MonthlyFinancialReportDto>> {
  await requireAdmin();

  try {
    const todayStr = toBusinessDateString(new Date());
    const [currentYearStr, currentMonthStr] = todayStr.split("-");
    const year = targetYear || parseInt(currentYearStr, 10);
    const month = targetMonth || parseInt(currentMonthStr, 10);

    const monthPadded = String(month).padStart(2, "0");
    const startOfMonthStr = `${year}-${monthPadded}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const endOfMonthStr = `${year}-${monthPadded}-${String(lastDayNum).padStart(2, "0")}`;

    const startOfMonth = createBusinessDateTime(startOfMonthStr, "00:00");
    const endOfMonth = new Date(
      createBusinessDateTime(endOfMonthStr, "23:59").getTime() + 59999
    );

    // Get currency settings
    const depositSetting = await getOrEnsurePrimaryDepositSetting();
    const currency = depositSetting?.currency || "MYR";
    const currencySymbol = depositSetting?.currencySymbol || "RM";

    // 1. Fetch Completed Bookings / Sales in this month
    const bookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        startDatetime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        service: true,
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { startDatetime: "asc" },
    });

    // 1.5 Auto-normalize legacy Chinese titles in DB to English
    try {
      await prisma.expense.updateMany({
        where: { title: "水电杂费" },
        data: { title: "Utilities" },
      });
      await prisma.expense.updateMany({
        where: { title: "进货库存" },
        data: { title: "Stock / Supplies" },
      });
      await prisma.expense.updateMany({
        where: { title: "店面租金" },
        data: { title: "Shop Rent" },
      });
      await prisma.expense.updateMany({
        where: { title: { in: ["员工薪资", "员工薪资/提成"] } },
        data: { title: "Salary / Commission" },
      });
      await prisma.expense.updateMany({
        where: { title: "推广广告" },
        data: { title: "Marketing" },
      });
      await prisma.expense.updateMany({
        where: { title: "其他杂费" },
        data: { title: "Other Misc" },
      });
    } catch (e) {
      // ignore
    }

    // 2. Fetch Expenses and Member Cash Reloads/Promo Purchases in this month
    const [expenses, memberCashTxs] = await Promise.all([
      prisma.expense.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.memberTransaction.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          cashPaidCents: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const memberSalesCents = memberCashTxs.reduce((sum, t) => sum + t.cashPaidCents, 0);

    // Calculate Sales KPIs
    const grossSalesCents =
      bookings.reduce((sum, b) => sum + b.totalPriceCents, 0) + memberSalesCents;
    const completedOrdersCount = bookings.length + memberCashTxs.length;

    // Calculate Expenses KPIs
    const totalExpensesCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
    const expenseCount = expenses.length;

    // Calculate Net Profit
    const netProfitCents = grossSalesCents - totalExpensesCents;
    const profitMarginPercent =
      grossSalesCents > 0
        ? Math.round((netProfitCents / grossSalesCents) * 1000) / 10
        : 0;

    // Category breakdown for expenses
    const categoryMap: Record<ExpenseCategory, { totalCents: number; count: number }> = {
      STOCK: { totalCents: 0, count: 0 },
      RENT: { totalCents: 0, count: 0 },
      UTILITIES: { totalCents: 0, count: 0 },
      SALARY: { totalCents: 0, count: 0 },
      MARKETING: { totalCents: 0, count: 0 },
      OTHER: { totalCents: 0, count: 0 },
    };

    const categoryMeta: Record<ExpenseCategory, { zh: string; en: string; icon: string }> = {
      STOCK: { zh: "进货库存", en: "Stock / Supplies", icon: "📦" },
      RENT: { zh: "店面租金", en: "Shop Rent", icon: "🏢" },
      UTILITIES: { zh: "水电杂费", en: "Utilities", icon: "💡" },
      SALARY: { zh: "员工薪资/提成", en: "Salary / Commission", icon: "👤" },
      MARKETING: { zh: "推广广告", en: "Marketing", icon: "📣" },
      OTHER: { zh: "其他杂费", en: "Other Misc", icon: "🧾" },
    };

    for (const exp of expenses) {
      const cat = (exp.category as ExpenseCategory) || "OTHER";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalCents: 0, count: 0 };
      }
      categoryMap[cat].totalCents += exp.amountCents;
      categoryMap[cat].count += 1;
    }

    const expenseCategories = (Object.keys(categoryMap) as ExpenseCategory[])
      .filter((cat) => categoryMap[cat].count > 0 || cat === "STOCK" || cat === "RENT")
      .map((cat) => {
        const item = categoryMap[cat];
        const pct =
          totalExpensesCents > 0
            ? Math.round((item.totalCents / totalExpensesCents) * 1000) / 10
            : 0;
        return {
          category: cat,
          labelZh: categoryMeta[cat]?.zh || cat,
          labelEn: categoryMeta[cat]?.en || cat,
          icon: categoryMeta[cat]?.icon || "🧾",
          totalCents: item.totalCents,
          count: item.count,
          percentage: pct,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);

    // Service Breakdown for Sales
    const serviceMap = new Map<string, { serviceName: string; category: string | null; count: number; totalCents: number }>();
    for (const b of bookings) {
      if (b.items && b.items.length > 0) {
        for (const it of b.items) {
          const sId = it.serviceId;
          const sName = it.service.name;
          const sCat = it.service.category;
          const cur = serviceMap.get(sId) || { serviceName: sName, category: sCat, count: 0, totalCents: 0 };
          cur.count += 1;
          cur.totalCents += it.priceCents;
          serviceMap.set(sId, cur);
        }
      } else if (b.service) {
        const sId = b.serviceId;
        const cur = serviceMap.get(sId) || { serviceName: b.service.name, category: b.service.category, count: 0, totalCents: 0 };
        cur.count += 1;
        cur.totalCents += b.totalPriceCents;
        serviceMap.set(sId, cur);
      }
    }

    const servicesBreakdown = Array.from(serviceMap.entries()).map(([serviceId, val]) => ({
      serviceId,
      serviceName: val.serviceName,
      category: val.category,
      count: val.count,
      totalCents: val.totalCents,
    })).sort((a, b) => b.totalCents - a.totalCents);

    // Formatted Expense DTOs
    const formattedExpenses: ExpenseDto[] = expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: (e.category as ExpenseCategory) || "OTHER",
      amountCents: e.amountCents,
      dateStr: toBusinessDateString(e.date),
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    }));

    // Daily Breakdown
    const dayMap = new Map<number, { salesCents: number; expenseCents: number; ordersCount: number }>();
    for (let d = 1; d <= lastDayNum; d++) {
      dayMap.set(d, { salesCents: 0, expenseCents: 0, ordersCount: 0 });
    }

    for (const b of bookings) {
      const bDateStr = toBusinessDateString(b.startDatetime);
      const dayNum = parseInt(bDateStr.slice(8, 10), 10);
      const cur = dayMap.get(dayNum);
      if (cur) {
        cur.salesCents += b.totalPriceCents;
        cur.ordersCount += 1;
      }
    }

    for (const mt of memberCashTxs) {
      const mDateStr = toBusinessDateString(mt.createdAt);
      const dayNum = parseInt(mDateStr.slice(8, 10), 10);
      const cur = dayMap.get(dayNum);
      if (cur) {
        cur.salesCents += mt.cashPaidCents;
        cur.ordersCount += 1;
      }
    }

    for (const e of expenses) {
      const eDateStr = toBusinessDateString(e.date);
      const dayNum = parseInt(eDateStr.slice(8, 10), 10);
      const cur = dayMap.get(dayNum);
      if (cur) {
        cur.expenseCents += e.amountCents;
      }
    }

    const dailyBreakdown = Array.from(dayMap.entries()).map(([dayNum, val]) => {
      const dStr = `${year}-${monthPadded}-${String(dayNum).padStart(2, "0")}`;
      return {
        dateStr: dStr,
        dayNum,
        salesCents: val.salesCents,
        expenseCents: val.expenseCents,
        netProfitCents: val.salesCents - val.expenseCents,
        ordersCount: val.ordersCount,
      };
    });

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    return {
      success: true,
      data: {
        year,
        month,
        monthLabel,
        currency,
        currencySymbol,
        grossSalesCents,
        completedOrdersCount,
        totalExpensesCents,
        expenseCount,
        netProfitCents,
        profitMarginPercent,
        expenseCategories,
        servicesBreakdown,
        expenses: formattedExpenses,
        dailyBreakdown,
      },
    };
  } catch (error) {
    console.error("[getMonthlyFinancialReport]", error);
    return { success: false, error: "Failed to load monthly financial report." };
  }
}

// ----------------------------------------------------------------
// Create Expense (Stock purchase, rent, utilities, etc.)
// ----------------------------------------------------------------
// Default category titles stored in database (Always in English, localized on UI)
const DEFAULT_CATEGORY_TITLES: Record<ExpenseCategory, string> = {
  STOCK: "Stock / Supplies",
  RENT: "Shop Rent",
  UTILITIES: "Utilities",
  SALARY: "Salary / Commission",
  MARKETING: "Marketing",
  OTHER: "Other Misc",
};

export async function createDeskExpense(data: {
  title?: string;
  category: ExpenseCategory;
  amountCents: number;
  dateStr?: string;
  notes?: string;
}): Promise<ActionResult<ExpenseDto>> {
  await requireAdmin();

  try {
    const category = data.category || "STOCK";
    let title = data.title?.trim() || "";

    // Title is only strictly required if user selects "OTHER"
    if (category === "OTHER" && !title) {
      return {
        success: false,
        error: "Please enter description for Other Expense. / 选择其他杂费时请输入具体名称",
      };
    }

    // Default title to category name if left blank (Always English in DB)
    if (!title) {
      title = DEFAULT_CATEGORY_TITLES[category] || "Expense";
    }

    if (data.amountCents <= 0) {
      return { success: false, error: "Amount must be greater than 0. / 金额必须大于零" };
    }

    const dateStr = data.dateStr || toBusinessDateString(new Date());
    const expenseDate = createBusinessDateTime(dateStr, "12:00");

    const created = await prisma.expense.create({
      data: {
        title,
        category,
        amountCents: data.amountCents,
        date: expenseDate,
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin");

    return {
      success: true,
      data: {
        id: created.id,
        title: created.title,
        category: created.category as ExpenseCategory,
        amountCents: created.amountCents,
        dateStr: toBusinessDateString(created.date),
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createDeskExpense]", error);
    return { success: false, error: "Failed to record expense. / 保存支出失败" };
  }
}

// ----------------------------------------------------------------
// Batch Create Expenses (Key in multiple expenses at once)
// ----------------------------------------------------------------
export async function createBatchDeskExpenses(
  items: Array<{
    title?: string;
    category: ExpenseCategory;
    amountCents: number;
    dateStr?: string;
    notes?: string;
  }>
): Promise<ActionResult<{ count: number; totalCents: number }>> {
  await requireAdmin();

  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No expenses provided. / 没有提供支出记录" };
    }

    const validRecords: Array<{
      title: string;
      category: string;
      amountCents: number;
      date: Date;
      notes: string | null;
    }> = [];

    let totalCents = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.amountCents || item.amountCents <= 0) continue;

      const category = item.category || "STOCK";
      let title = item.title?.trim() || "";

      if (category === "OTHER" && !title) {
        return {
          success: false,
          error: `Please enter description for item #${i + 1} (Other Expense). / 第 ${i + 1} 项选择“其他杂费”，请输入具体名称`,
        };
      }

      if (!title) {
        title = DEFAULT_CATEGORY_TITLES[category] || "Expense";
      }

      const dateStr = item.dateStr || toBusinessDateString(new Date());
      const expenseDate = createBusinessDateTime(dateStr, "12:00");

      validRecords.push({
        title,
        category,
        amountCents: item.amountCents,
        date: expenseDate,
        notes: item.notes?.trim() || null,
      });

      totalCents += item.amountCents;
    }

    if (validRecords.length === 0) {
      return {
        success: false,
        error: "Please enter at least one valid amount. / 请至少输入一笔有效金额",
      };
    }

    await prisma.expense.createMany({
      data: validRecords,
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin");

    return {
      success: true,
      data: {
        count: validRecords.length,
        totalCents,
      },
    };
  } catch (error) {
    console.error("[createBatchDeskExpenses]", error);
    return { success: false, error: "Failed to save expenses in batch. / 批量保存支出失败" };
  }
}

// ----------------------------------------------------------------
// Delete Expense
// ----------------------------------------------------------------
export async function deleteDeskExpense(expenseId: string): Promise<ActionResult<void>> {
  await requireAdmin();

  try {
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteDeskExpense]", error);
    return { success: false, error: "Failed to delete expense. / 删除支出失败" };
  }
}
