"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { getOrEnsurePrimaryDepositSetting } from "./deposit";
import { toBusinessDateString, createBusinessDateTime } from "@/lib/utils";
import type { ActionResult, ExpenseCategory } from "@/types";

export interface MonthlyStatementDto {
  statementNo: string;
  businessName: string;
  businessPhone: string;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  currency: string;
  currencySymbol: string;
  grossSalesCents: number;
  completedOrdersCount: number;
  averageOrderCents: number;
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
  topServices: {
    serviceName: string;
    count: number;
    totalCents: number;
  }[];
  includeExpenses: boolean;
  totalExpensesCents: number;
  expenseCount: number;
  netProfitCents: number;
  profitMarginPercent: number;
  expenseCategories: {
    category: ExpenseCategory;
    totalCents: number;
    count: number;
  }[];
  transactions: {
    id: string;
    referenceCode: string;
    dateStr: string;
    timeStr: string;
    customerName: string;
    phoneNumber: string;
    isWalkin: boolean;
    services: string;
    serviceNames: string[];
    paymentMethod: "CASH" | "DUITNOW_QR" | "CARD" | "OTHER";
    amountCents: number;
    notes: string;
  }[];
}

export async function getMonthlyStatementData(
  targetYear?: number,
  targetMonth?: number,
  includeExpenses: boolean = true
): Promise<ActionResult<MonthlyStatementDto>> {
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

    // Business & Currency settings
    const depositSetting = await getOrEnsurePrimaryDepositSetting();
    const businessName =
      depositSetting?.recipientName ||
      process.env.NEXT_PUBLIC_BUSINESS_NAME ||
      "Salon & Hair Studio";
    const businessPhone =
      process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP || "+60 16-473 8833";
    const currency = depositSetting?.currency || "MYR";
    const currencySymbol = depositSetting?.currencySymbol || "RM";

    // 1. Fetch Completed Bookings in target month
    const bookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        startDatetime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        customer: true,
        service: true,
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { startDatetime: "asc" },
    });

    // 2. Fetch Expenses if requested
    const expenses = includeExpenses
      ? await prisma.expense.findMany({
          where: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          orderBy: { date: "asc" },
        })
      : [];

    // Financial KPIs
    const grossSalesCents = bookings.reduce((sum, b) => sum + b.totalPriceCents, 0);
    const completedOrdersCount = bookings.length;
    const averageOrderCents =
      completedOrdersCount > 0 ? Math.round(grossSalesCents / completedOrdersCount) : 0;

    const totalExpensesCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
    const expenseCount = expenses.length;
    const netProfitCents = grossSalesCents - totalExpensesCents;
    const profitMarginPercent =
      grossSalesCents > 0
        ? Math.round((netProfitCents / grossSalesCents) * 1000) / 10
        : 0;

    // Payment Channels Aggregation
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

    // Services breakdown map
    const serviceMap: Record<string, { count: number; totalCents: number }> = {};

    // Transform individual transactions
    const transactions = bookings.map((b) => {
      const dt = new Date(b.startDatetime);
      const dateStr = dt.toISOString().slice(0, 10);
      const timeStr = dt.toTimeString().slice(0, 5);

      const isWalkin = b.customer.phoneNumber.startsWith("WALKIN-");
      const serviceNames =
        b.items.length > 0
          ? b.items.map((it) => it.service.name)
          : b.service?.name
          ? [b.service.name]
          : ["Service"];
      const serviceList = serviceNames.join(", ");

      // Count services
      if (b.items.length > 0) {
        for (const item of b.items) {
          const sName = item.service.name;
          if (!serviceMap[sName]) serviceMap[sName] = { count: 0, totalCents: 0 };
          serviceMap[sName].count += 1;
          serviceMap[sName].totalCents += item.priceCents;
        }
      } else if (b.service) {
        const sName = b.service.name;
        if (!serviceMap[sName]) serviceMap[sName] = { count: 0, totalCents: 0 };
        serviceMap[sName].count += 1;
        serviceMap[sName].totalCents += b.totalPriceCents;
      }

      // Detect payment method
      let method: "CASH" | "DUITNOW_QR" | "CARD" | "OTHER" = "OTHER";
      if (b.notes?.includes("CASH")) {
        method = "CASH";
        paymentChannels.cashCents += b.totalPriceCents;
        paymentChannels.cashCount += 1;
      } else if (b.notes?.includes("DUITNOW_QR")) {
        method = "DUITNOW_QR";
        paymentChannels.qrCents += b.totalPriceCents;
        paymentChannels.qrCount += 1;
      } else if (b.notes?.includes("CARD")) {
        method = "CARD";
        paymentChannels.cardCents += b.totalPriceCents;
        paymentChannels.cardCount += 1;
      } else {
        paymentChannels.otherCents += b.totalPriceCents;
        paymentChannels.otherCount += 1;
      }

      return {
        id: b.id,
        referenceCode: b.referenceCode,
        dateStr,
        timeStr,
        customerName: b.customer.name,
        phoneNumber: b.customer.phoneNumber,
        isWalkin,
        services: serviceList,
        serviceNames,
        paymentMethod: method,
        amountCents: b.totalPriceCents,
        notes: b.notes || "",
      };
    });

    // Top services sorted by total cents descending
    const topServices = Object.entries(serviceMap)
      .map(([serviceName, data]) => ({
        serviceName,
        count: data.count,
        totalCents: data.totalCents,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    // Expense Categories Aggregation
    const expenseCategoryMap: Record<ExpenseCategory, { totalCents: number; count: number }> = {
      STOCK: { totalCents: 0, count: 0 },
      RENT: { totalCents: 0, count: 0 },
      UTILITIES: { totalCents: 0, count: 0 },
      SALARY: { totalCents: 0, count: 0 },
      MARKETING: { totalCents: 0, count: 0 },
      OTHER: { totalCents: 0, count: 0 },
    };

    for (const exp of expenses) {
      const cat = (exp.category as ExpenseCategory) || "OTHER";
      if (expenseCategoryMap[cat]) {
        expenseCategoryMap[cat].totalCents += exp.amountCents;
        expenseCategoryMap[cat].count += 1;
      }
    }

    const expenseCategories = (Object.keys(expenseCategoryMap) as ExpenseCategory[])
      .map((cat) => ({
        category: cat,
        totalCents: expenseCategoryMap[cat].totalCents,
        count: expenseCategoryMap[cat].count,
      }))
      .filter((c) => c.totalCents > 0 || c.count > 0);

    const statementNo = `STMT-${year}${monthPadded}-${Math.abs(grossSalesCents % 10000).toString().padStart(4, "0")}`;

    return {
      success: true,
      data: {
        statementNo,
        businessName,
        businessPhone,
        year,
        month,
        periodStart: startOfMonthStr,
        periodEnd: endOfMonthStr,
        generatedAt: new Date().toISOString(),
        currency,
        currencySymbol,
        grossSalesCents,
        completedOrdersCount,
        averageOrderCents,
        paymentChannels,
        topServices,
        includeExpenses,
        totalExpensesCents,
        expenseCount,
        netProfitCents,
        profitMarginPercent,
        expenseCategories,
        transactions,
      },
    };
  } catch (error) {
    console.error("[getMonthlyStatementData]", error);
    return { success: false, error: "Failed to generate monthly statement." };
  }
}
