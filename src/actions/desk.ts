"use server";

import { Prisma } from "@prisma/client";
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
  normalizePhoneNumber,
} from "@/lib/utils";
import { invalidateBookingCache } from "@/lib/booking-cache";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import { revalidatePath } from "next/cache";
import { getOrEnsurePrimaryDepositSetting } from "./deposit";
import type { CustomerReceiptData } from "@/lib/whatsapp";
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
  requireReportPin: boolean;
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

    // Fetch today's bookings and SQL aggregates for yesterday/month & member sales
    type TodayBookingWithRelations = Prisma.BookingGetPayload<{
      include: {
        service: true;
        items: {
          include: { service: true };
        };
      };
    }>;

    let bookings: TodayBookingWithRelations[] = [];
    let yesterdayBookingSalesCents = 0;
    let yesterdayCompletedCount = 0;
    let monthBookingSalesCents = 0;
    let monthCompletedCount = 0;
    let todayMemberSalesCents = 0;
    let yesterdayMemberSalesCents = 0;
    let monthMemberSalesCents = 0;
    try {
      const [
        bToday,
        bYesterdayAgg,
        bMonthAgg,
        mTodayAgg,
        mYesterdayAgg,
        mMonthAgg,
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
        prisma.booking.aggregate({
          where: {
            startDatetime: { gte: startOfYesterday, lte: endOfYesterday },
            status: "COMPLETED",
          },
          _sum: { totalPriceCents: true },
          _count: { _all: true },
        }),
        prisma.booking.aggregate({
          where: {
            startDatetime: { gte: startOfMonth, lte: endOfMonth },
            status: "COMPLETED",
          },
          _sum: { totalPriceCents: true },
          _count: { _all: true },
        }),
        prisma.memberTransaction.aggregate({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            cashPaidCents: { gt: 0 },
          },
          _sum: { cashPaidCents: true },
        }),
        prisma.memberTransaction.aggregate({
          where: {
            createdAt: { gte: startOfYesterday, lte: endOfYesterday },
            cashPaidCents: { gt: 0 },
          },
          _sum: { cashPaidCents: true },
        }),
        prisma.memberTransaction.aggregate({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            cashPaidCents: { gt: 0 },
          },
          _sum: { cashPaidCents: true },
        }),
      ]);
      bookings = bToday;
      yesterdayBookingSalesCents = bYesterdayAgg._sum.totalPriceCents ?? 0;
      yesterdayCompletedCount = bYesterdayAgg._count._all;
      monthBookingSalesCents = bMonthAgg._sum.totalPriceCents ?? 0;
      monthCompletedCount = bMonthAgg._count._all;
      todayMemberSalesCents = mTodayAgg._sum.cashPaidCents ?? 0;
      yesterdayMemberSalesCents = mYesterdayAgg._sum.cashPaidCents ?? 0;
      monthMemberSalesCents = mMonthAgg._sum.cashPaidCents ?? 0;
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

    const yesterdaySalesCents = yesterdayBookingSalesCents + yesterdayMemberSalesCents;
    const monthSalesCents = monthBookingSalesCents + monthMemberSalesCents;

    const currency = "MYR";
    const currencySymbol = "RM";
    const deskLanguage = normalizeDeskLanguageMode(depositSetting?.deskLanguage);
    const showTodaySales = depositSetting?.showTodaySales ?? true;
    const showYesterdaySales = depositSetting?.showYesterdaySales ?? true;
    const showMonthlySales = depositSetting?.showMonthlySales ?? true;
    const showServiceBreakdown = depositSetting?.showServiceBreakdown ?? true;
    const showMakeAppointment = depositSetting?.showMakeAppointment ?? true;
    const showWalkIn = depositSetting?.showWalkIn ?? true;
    const showBookedCheckout = depositSetting?.showBookedCheckout ?? true;
    const requireReportPin = depositSetting?.requireReportPin ?? true;

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
        requireReportPin,
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
  idempotencyKey?: string;
}

/**
 * Record and finalize sales for either an existing appointment or a walk-in client,
 * with full support for Member Promo Session Redemptions and Member Credit deductions.
 */
export async function recordDeskSale(
  input: RecordDeskSaleInput
): Promise<
  ActionResult<{
    referenceCode: string;
    totalCents: number;
    creditUsedCents: number;
    remainingCreditCents: number;
    customerName: string;
    customerPhone: string;
    receipt?: CustomerReceiptData;
  }>
> {
  await requireAdmin();
  const idempotencyKey = input.idempotencyKey?.trim() || null;

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

    const result = await prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existingIdempotent = await tx.booking.findUnique({
            where: { checkoutIdempotencyKey: idempotencyKey },
            select: {
              referenceCode: true,
              totalPriceCents: true,
              creditUsedCents: true,
              customer: {
                select: { name: true, phoneNumber: true, creditBalanceCents: true },
              },
            },
          });
          if (existingIdempotent) {
            return {
              referenceCode: existingIdempotent.referenceCode,
              totalCents: existingIdempotent.totalPriceCents,
              creditUsedCents: existingIdempotent.creditUsedCents,
              remainingCreditCents: existingIdempotent.customer.creditBalanceCents,
              customerName: existingIdempotent.customer.name,
              customerPhone: existingIdempotent.customer.phoneNumber,
            };
          }
        }

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
          if (existingBooking.status === "COMPLETED") {
            throw new Error("This appointment has already been checked out.");
          }
          if (existingBooking.status === "CANCELLED") {
            throw new Error("Cannot check out a cancelled appointment.");
          }
          targetCustomer = existingBooking.customer;
        } else if (customerId) {
          targetCustomer = await tx.customer.findUnique({ where: { id: customerId } });
        }

        if (!targetCustomer) {
          const cleanPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : "";
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

        // Process Promo Session Redemptions atomically
        const redeemedNotes: string[] = [];
        const promoLabelByServiceId = new Map<string, string>();
        for (const item of itemLineData) {
          if (!item.memberPackageId) continue;
          const decremented = await tx.memberPackage.updateMany({
            where: {
              id: item.memberPackageId,
              customerId: targetCustomer.id,
              remainingSessions: { gte: 1 },
            },
            data: {
              remainingSessions: { decrement: 1 },
            },
          });
          if (decremented.count === 0) {
            const checkPkg = await tx.memberPackage.findUnique({
              where: { id: item.memberPackageId },
            });
            if (!checkPkg || checkPkg.customerId !== targetCustomer.id) {
              throw new Error("Invalid member promo package selected.");
            }
            throw new Error(`No sessions remaining on promo "${checkPkg.name}".`);
          }
          const updatedPkg = await tx.memberPackage.findUnique({
            where: { id: item.memberPackageId },
          });
          const nextRemaining = updatedPkg?.remainingSessions ?? 0;
          if (updatedPkg && nextRemaining === 0 && updatedPkg.status !== "COMPLETED") {
            await tx.memberPackage.update({
              where: { id: updatedPkg.id },
              data: { status: "COMPLETED" },
            });
          }
          const summaryStr = `${updatedPkg?.name || "Promo"} (-1, ${nextRemaining}/${updatedPkg?.totalSessions ?? 0} left)`;
          redeemedNotes.push(summaryStr);
          promoLabelByServiceId.set(
            item.serviceId,
            `${updatedPkg?.name || "Promo"} (${nextRemaining}/${updatedPkg?.totalSessions ?? 0} left)`
          );
        }

        // Process Member Credit Deduction atomically with non-negative guard
        let actualCreditUsedCents = 0;
        let nextCreditBalance = targetCustomer.creditBalanceCents;
        if (useCreditCents > 0 && balanceBeforeCreditCents > 0) {
          actualCreditUsedCents = Math.min(
            useCreditCents,
            targetCustomer.creditBalanceCents,
            balanceBeforeCreditCents
          );
          if (actualCreditUsedCents > 0) {
            const deducted = await tx.customer.updateMany({
              where: {
                id: targetCustomer.id,
                creditBalanceCents: { gte: actualCreditUsedCents },
              },
              data: {
                creditBalanceCents: { decrement: actualCreditUsedCents },
              },
            });
            if (deducted.count === 0) {
              throw new Error(
                "Insufficient member credit balance. Please refresh and try again."
              );
            }
            const refreshedCustomer = await tx.customer.findUnique({
              where: { id: targetCustomer.id },
              select: { creditBalanceCents: true },
            });
            nextCreditBalance =
              refreshedCustomer?.creditBalanceCents ??
              Math.max(0, targetCustomer.creditBalanceCents - actualCreditUsedCents);
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
              checkoutIdempotencyKey: idempotencyKey,
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
              checkoutIdempotencyKey: idempotencyKey,
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
              idempotencyKey: idempotencyKey ? `${idempotencyKey}:credit` : null,
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

        const receipt: CustomerReceiptData = {
          referenceCode: finalRefCode,
          timestampIso: new Date().toISOString(),
          customerName: targetCustomer.name,
          customerPhone: targetCustomer.phoneNumber,
          items: itemLineData.map((it) => ({
            name: it.serviceName,
            originalPriceCents: it.originalPriceCents,
            paidPriceCents: it.priceCents,
            promoLabel: promoLabelByServiceId.get(it.serviceId) ?? null,
          })),
          subtotalCents: grossSubtotalCents,
          promoDiscountCents,
          depositPaidCents,
          creditUsedCents: actualCreditUsedCents,
          remainingCreditCents:
            targetCustomer.isMember || actualCreditUsedCents > 0 || nextCreditBalance > 0
              ? nextCreditBalance
              : null,
          promoSummaries: redeemedNotes,
          totalPaidCents: netCashCollectedCents,
          paymentMethod:
            netCashCollectedCents > 0 ? paymentMethod : "OTHER",
        };

        return {
          referenceCode: finalRefCode,
          totalCents: netCashCollectedCents,
          creditUsedCents: actualCreditUsedCents,
          remainingCreditCents: nextCreditBalance,
          customerName: targetCustomer.name,
          customerPhone: targetCustomer.phoneNumber,
          receipt,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.booking.findUnique({
        where: { checkoutIdempotencyKey: idempotencyKey },
        select: {
          referenceCode: true,
          totalPriceCents: true,
          creditUsedCents: true,
          customer: {
            select: { name: true, phoneNumber: true, creditBalanceCents: true },
          },
        },
      });
      if (existing) {
        return {
          success: true,
          data: {
            referenceCode: existing.referenceCode,
            totalCents: existing.totalPriceCents,
            creditUsedCents: existing.creditUsedCents,
            remainingCreditCents: existing.customer.creditBalanceCents,
            customerName: existing.customer.name,
            customerPhone: existing.customer.phoneNumber,
          },
        };
      }
    }
    console.error("[recordDeskSale]", error);
    const msg = error instanceof Error ? error.message : "Failed to process desk checkout.";
    return { success: false, error: msg };
  }
}

/**
 * 1-Tap Manual Appointment Creation (Directly from Desk)
 * Supports optional back-to-back guests for solo-stylist multi-person bookings
 * with automatic Serializable overlap protection.
 */
export async function createDeskAppointment(input: {
  customerName: string;
  phoneNumber: string;
  serviceId: string;
  startDatetimeIso: string;
  notes?: string;
  additionalGuests?: { serviceId: string; guestLabel?: string }[];
}): Promise<ActionResult<{ referenceCode: string; referenceCodes?: string[] }>> {
  await requireAdmin();

  try {
    const {
      customerName,
      phoneNumber,
      serviceId,
      startDatetimeIso,
      notes,
      additionalGuests = [],
    } = input;

    const requestedServiceIds = [
      serviceId,
      ...additionalGuests.map((g) => g.serviceId),
    ];
    const uniqueServiceIds = Array.from(new Set(requestedServiceIds));

    const servicesList = await prisma.service.findMany({
      where: { id: { in: uniqueServiceIds } },
    });
    const serviceMap = new Map(servicesList.map((s) => [s.id, s]));

    if (!serviceMap.get(serviceId)) {
      return { success: false, error: "Service not found." };
    }
    for (const guest of additionalGuests) {
      if (!serviceMap.get(guest.serviceId)) {
        return { success: false, error: "Service not found for additional person." };
      }
    }

    const overallStart = new Date(startDatetimeIso);
    if (Number.isNaN(overallStart.getTime())) {
      return { success: false, error: "Invalid appointment time." };
    }

    const cleanPhone = normalizePhoneNumber(phoneNumber) || phoneNumber.replace(/\s/g, "");
    const totalPeople = 1 + additionalGuests.length;

    // Build sequential back-to-back windows
    let cursor = overallStart;
    const legs: {
      service: (typeof servicesList)[number];
      start: Date;
      end: Date;
      personNote: string | null;
    }[] = [];

    const firstSvc = serviceMap.get(serviceId)!;
    const firstEnd = new Date(cursor.getTime() + firstSvc.durationMinutes * 60000);
    const trimmedNotes = notes?.trim() || "";
    legs.push({
      service: firstSvc,
      start: cursor,
      end: firstEnd,
      personNote:
        totalPeople > 1
          ? `Person 1/${totalPeople}${trimmedNotes ? ` · ${trimmedNotes}` : ""}`
          : trimmedNotes || null,
    });
    cursor = firstEnd;

    additionalGuests.forEach((guest, idx) => {
      const svc = serviceMap.get(guest.serviceId)!;
      const gStart = cursor;
      const gEnd = new Date(gStart.getTime() + svc.durationMinutes * 60000);
      const guestTag = guest.guestLabel?.trim();
      const label = `Person ${idx + 2}/${totalPeople}${guestTag ? ` (${guestTag})` : ""}`;
      legs.push({
        service: svc,
        start: gStart,
        end: gEnd,
        personNote: trimmedNotes ? `${label} · ${trimmedNotes}` : label,
      });
      cursor = gEnd;
    });

    const overallEnd = cursor;

    const createdCodes = await prisma.$transaction(
      async (tx) => {
        // Server-side overlap guard across the full chained duration
        const conflict = await tx.booking.findFirst({
          where: {
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            AND: [
              { startDatetime: { lt: overallEnd } },
              { endDatetime: { gt: overallStart } },
            ],
          },
          select: { referenceCode: true },
        });
        if (conflict) {
          throw new Error(
            "This time window overlaps with an existing appointment. Please choose another slot."
          );
        }

        const blockout = await tx.timeBlockout.findFirst({
          where: {
            AND: [
              { startDatetime: { lt: overallEnd } },
              { endDatetime: { gt: overallStart } },
            ],
          },
          select: { id: true },
        });
        if (blockout) {
          throw new Error(
            "This time window overlaps with a blocked-out time. Please choose another slot."
          );
        }

        const customer = await tx.customer.upsert({
          where: { phoneNumber: cleanPhone },
          update: { name: customerName.trim() },
          create: { name: customerName.trim(), phoneNumber: cleanPhone },
        });

        const codes: string[] = [];
        const submittedAt = new Date();

        for (const leg of legs) {
          let refCode = generateReferenceCode();
          let attempts = 0;
          while (attempts < 5) {
            const found = await tx.booking.findUnique({
              where: { referenceCode: refCode },
            });
            if (!found) break;
            refCode = generateReferenceCode();
            attempts++;
          }

          const booking = await tx.booking.create({
            data: {
              referenceCode: refCode,
              customerId: customer.id,
              serviceId: leg.service.id,
              startDatetime: leg.start,
              endDatetime: leg.end,
              totalPriceCents: leg.service.priceCents,
              depositDueCents: null,
              balanceDueCents: leg.service.priceCents,
              status: "CONFIRMED",
              notes: leg.personNote,
              receiptSubmittedAt: submittedAt,
              items: {
                create: [{ serviceId: leg.service.id, priceCents: leg.service.priceCents }],
              },
            },
          });
          codes.push(booking.referenceCode);
        }

        return codes;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath("/admin/desk");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");

    return {
      success: true,
      data: { referenceCode: createdCodes[0], referenceCodes: createdCodes },
    };
  } catch (error) {
    console.error("[createDeskAppointment]", error);
    const msg = error instanceof Error ? error.message : "Failed to create appointment.";
    return { success: false, error: msg };
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
    } catch {
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
      STOCK: { zh: "进货库存", en: "Stock / Supplies", icon: "package" },
      RENT: { zh: "店面租金", en: "Shop Rent", icon: "building" },
      UTILITIES: { zh: "水电杂费", en: "Utilities", icon: "lightbulb" },
      SALARY: { zh: "员工薪资/提成", en: "Salary / Commission", icon: "user" },
      MARKETING: { zh: "推广广告", en: "Marketing", icon: "megaphone" },
      OTHER: { zh: "其他杂费", en: "Other Misc", icon: "receipt" },
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
          icon: categoryMeta[cat]?.icon || "receipt",
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

// ----------------------------------------------------------------
// Today's Itemized Sales Details (Bookings + Member Reloads/Promos)
// ----------------------------------------------------------------
export type TodaySalePaymentMethod = "CASH" | "DUITNOW_QR" | "CARD" | "OTHER";

export interface TodaySaleItemDto {
  id: string;
  source: "BOOKING" | "WALKIN" | "MEMBER_RELOAD" | "MEMBER_PROMO";
  referenceCode: string;
  timestampIso: string;
  timeStr: string;
  customerName: string;
  phoneNumber: string;
  title: string;
  paymentMethod: TodaySalePaymentMethod;
  amountCents: number;
  creditUsedCents: number;
  receipt: CustomerReceiptData;
}

export interface TodaySalesDetailsDto {
  dateStr: string;
  currencySymbol: string;
  totalSalesCents: number;
  totalExpensesCents: number;
  netSalesCents: number;
  expensesCount: number;
  totalCount: number;
  paymentChannels: {
    cashCents: number;
    cashCount: number;
    qrCents: number;
    qrCount: number;
    cardCents: number;
    cardCount: number;
    otherCents: number;
    otherCount: number;
  };
  items: TodaySaleItemDto[];
}

function detectBookingPaymentMethod(notes?: string | null): TodaySalePaymentMethod {
  if (notes?.includes("CASH")) return "CASH";
  if (notes?.includes("DUITNOW_QR")) return "DUITNOW_QR";
  if (notes?.includes("CARD")) return "CARD";
  return "OTHER";
}

function normalizeMemberPaymentMethod(method?: string | null): TodaySalePaymentMethod {
  if (method === "CASH") return "CASH";
  if (method === "DUITNOW_QR") return "DUITNOW_QR";
  if (method === "CARD") return "CARD";
  return "OTHER";
}

export async function getTodaySalesDetails(
  targetDateInput?: string
): Promise<ActionResult<TodaySalesDetailsDto>> {
  await requireAdmin();

  try {
    const dateStr = targetDateInput || toBusinessDateString(new Date());
    const startOfDay = createBusinessDateTime(dateStr, "00:00");
    const endOfDay = new Date(
      createBusinessDateTime(dateStr, "23:59").getTime() + 59999
    );

    const [depositSetting, bookings, memberCashTxs, dayExpenses] = await Promise.all([
      getOrEnsurePrimaryDepositSetting(),
      prisma.booking.findMany({
        where: {
          startDatetime: { gte: startOfDay, lte: endOfDay },
          status: "COMPLETED",
        },
        include: {
          customer: {
            select: {
              name: true,
              phoneNumber: true,
              isMember: true,
              creditBalanceCents: true,
            },
          },
          service: { select: { name: true, priceCents: true } },
          items: {
            include: {
              service: { select: { name: true, priceCents: true } },
              memberPackage: {
                select: {
                  name: true,
                  remainingSessions: true,
                  totalSessions: true,
                },
              },
            },
          },
        },
        orderBy: { startDatetime: "desc" },
      }),
      prisma.memberTransaction.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          cashPaidCents: { gt: 0 },
        },
        include: {
          customer: {
            select: {
              name: true,
              phoneNumber: true,
              isMember: true,
              creditBalanceCents: true,
            },
          },
          memberPackage: {
            select: {
              name: true,
              remainingSessions: true,
              totalSessions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
        select: { amountCents: true },
      }),
    ]);

    const paymentChannels = {
      cashCents: 0,
      cashCount: 0,
      qrCents: 0,
      qrCount: 0,
      cardCents: 0,
      cardCount: 0,
      otherCents: 0,
      otherCount: 0,
    };

    const addChannel = (method: TodaySalePaymentMethod, amountCents: number) => {
      if (method === "CASH") {
        paymentChannels.cashCents += amountCents;
        paymentChannels.cashCount += 1;
      } else if (method === "DUITNOW_QR") {
        paymentChannels.qrCents += amountCents;
        paymentChannels.qrCount += 1;
      } else if (method === "CARD") {
        paymentChannels.cardCents += amountCents;
        paymentChannels.cardCount += 1;
      } else {
        paymentChannels.otherCents += amountCents;
        paymentChannels.otherCount += 1;
      }
    };

    const formatKlTime = (dt: Date) =>
      dt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kuala_Lumpur",
      });

    const bookingItems: TodaySaleItemDto[] = bookings.map((b) => {
      const dt = new Date(b.startDatetime);
      const isWalkin = b.customer.phoneNumber.startsWith("WALKIN-");
      const serviceNames =
        b.items.length > 0
          ? b.items.map((it) => it.service.name)
          : b.service?.name
          ? [b.service.name]
          : ["Service"];
      const method = detectBookingPaymentMethod(b.notes);
      addChannel(method, b.totalPriceCents);

      const receiptItems =
        b.items.length > 0
          ? b.items.map((it) => {
              const orig = it.originalPriceCents ?? it.service.priceCents ?? it.priceCents;
              const promoLabel = it.memberPackage
                ? `${it.memberPackage.name} (${it.memberPackage.remainingSessions}/${it.memberPackage.totalSessions} left)`
                : null;
              return {
                name: it.service.name,
                originalPriceCents: orig,
                paidPriceCents: it.priceCents,
                promoLabel,
              };
            })
          : [
              {
                name: b.service?.name || "Service",
                originalPriceCents:
                  b.totalPriceCents +
                  (b.promoDiscountCents ?? 0) +
                  (b.creditUsedCents ?? 0) +
                  (b.depositDueCents ?? 0),
                paidPriceCents: b.totalPriceCents,
                promoLabel: null,
              },
            ];

      const subtotalCents = receiptItems.reduce(
        (sum, it) => sum + it.originalPriceCents,
        0
      );
      const promoSummaries = b.items
        .filter((it) => it.memberPackage)
        .map(
          (it) =>
            `${it.memberPackage!.name} (${it.memberPackage!.remainingSessions}/${it.memberPackage!.totalSessions} left)`
        );

      const receipt: CustomerReceiptData = {
        referenceCode: b.referenceCode,
        timestampIso: dt.toISOString(),
        customerName: b.customer.name,
        customerPhone: b.customer.phoneNumber,
        items: receiptItems,
        subtotalCents,
        promoDiscountCents: b.promoDiscountCents ?? 0,
        depositPaidCents: b.depositDueCents ?? 0,
        creditUsedCents: b.creditUsedCents ?? 0,
        remainingCreditCents:
          b.customer.isMember || (b.creditUsedCents ?? 0) > 0
            ? b.customer.creditBalanceCents
            : null,
        promoSummaries,
        totalPaidCents: b.totalPriceCents,
        paymentMethod: method,
      };

      return {
        id: b.id,
        source: isWalkin ? "WALKIN" : "BOOKING",
        referenceCode: b.referenceCode,
        timestampIso: dt.toISOString(),
        timeStr: formatKlTime(dt),
        customerName: b.customer.name,
        phoneNumber: b.customer.phoneNumber,
        title: serviceNames.join(", "),
        paymentMethod: method,
        amountCents: b.totalPriceCents,
        creditUsedCents: b.creditUsedCents ?? 0,
        receipt,
      };
    });

    const memberItems: TodaySaleItemDto[] = memberCashTxs.map((mt) => {
      const dt = new Date(mt.createdAt);
      const method = normalizeMemberPaymentMethod(mt.paymentMethod);
      addChannel(method, mt.cashPaidCents);
      const isReload = mt.type === "CREDIT_RELOAD";
      const refCode = `MEM-${mt.id.slice(-5).toUpperCase()}`;
      const title = isReload
        ? "Member Credit Reload"
        : mt.memberPackage?.name || "Member Promo Package";

      const receipt: CustomerReceiptData = {
        referenceCode: refCode,
        timestampIso: dt.toISOString(),
        customerName: mt.customer.name,
        customerPhone: mt.customer.phoneNumber,
        items: [
          {
            name: title,
            originalPriceCents: mt.cashPaidCents,
            paidPriceCents: mt.cashPaidCents,
            promoLabel: null,
          },
        ],
        subtotalCents: mt.cashPaidCents,
        promoDiscountCents: 0,
        depositPaidCents: 0,
        creditUsedCents: 0,
        remainingCreditCents: isReload
          ? mt.balanceAfterCents
          : mt.customer.creditBalanceCents > 0
          ? mt.customer.creditBalanceCents
          : null,
        promoSummaries:
          !isReload && mt.memberPackage
            ? [
                `${mt.memberPackage.name} (${mt.memberPackage.remainingSessions}/${mt.memberPackage.totalSessions} left)`,
              ]
            : [],
        totalPaidCents: mt.cashPaidCents,
        paymentMethod: method,
      };

      return {
        id: mt.id,
        source: isReload ? "MEMBER_RELOAD" : "MEMBER_PROMO",
        referenceCode: refCode,
        timestampIso: dt.toISOString(),
        timeStr: formatKlTime(dt),
        customerName: mt.customer.name,
        phoneNumber: mt.customer.phoneNumber,
        title,
        paymentMethod: method,
        amountCents: mt.cashPaidCents,
        creditUsedCents: 0,
        receipt,
      };
    });

    const items = [...bookingItems, ...memberItems].sort((a, b) =>
      b.timestampIso.localeCompare(a.timestampIso)
    );
    const totalSalesCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const totalExpensesCents = dayExpenses.reduce((sum, e) => sum + e.amountCents, 0);
    const netSalesCents = totalSalesCents - totalExpensesCents;

    return {
      success: true,
      data: {
        dateStr,
        currencySymbol: depositSetting?.currencySymbol || "RM",
        totalSalesCents,
        totalExpensesCents,
        netSalesCents,
        expensesCount: dayExpenses.length,
        totalCount: items.length,
        paymentChannels,
        items,
      },
    };
  } catch (error) {
    console.error("[getTodaySalesDetails]", error);
    return { success: false, error: "Failed to load today's sales details." };
  }
}
