import type { BookingStatus } from "@prisma/client";

// ----------------------------------------------------------------
// Re-export Prisma-generated types for convenience across the app
// ----------------------------------------------------------------
export type { BookingStatus };

// ----------------------------------------------------------------
// Booking funnel step definitions
// ----------------------------------------------------------------
export type BookingStep = 1 | 2 | 3 | 4;

// ----------------------------------------------------------------
// Plain (serialisable) types used in Server Action return values
// ----------------------------------------------------------------
export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
}

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export interface BookingConfirmation {
  referenceCode: string;
  serviceName: string;
  startDatetime: string; // ISO
  endDatetime: string;   // ISO
  customerName: string;
  totalPriceCents: number;
  depositDueCents?: number | null;
  balanceDueCents?: number | null;
  paymentQrDataUrl?: string | null;
  recipientName?: string | null;
  whatsappUrl: string;
  holdExpiresAt?: string; // ISO
}

export interface BookingDto {
  id: string;
  referenceCode: string;
  status: BookingStatus;
  startDatetime: string;
  endDatetime: string;
  totalPriceCents: number;
  depositDueCents?: number | null;
  balanceDueCents?: number | null;
  notes: string | null;
  receiptSubmittedAt?: string | null;
  createdAt: string;
  customer: {
    name: string;
    phoneNumber: string;
  };
  service: {
    name: string;
    durationMinutes: number;
  };
}

export interface BusinessScheduleDto {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface TimeBlockoutDto {
  id: string;
  startDatetime: string;
  endDatetime: string;
  reason: string | null;
}

export interface CustomerBookingLookupDto {
  referenceCode: string;
  status: BookingStatus;
  receiptSubmittedAt: string | null;
  serviceName: string;
  customerName: string;
  maskedPhone: string;
  startDatetime: string;
  endDatetime: string;
  totalPriceCents: number;
  depositDueCents?: number | null;
  balanceDueCents?: number | null;
  whatsappUrl: string;
}

export interface DepositSettingDto {
  isEnabled: boolean;
  type: "FIXED" | "PERCENTAGE";
  amountCents: number;
  percentage: number;
  duitnowPayload: string | null;
  recipientName: string | null;
  currency: string;
  currencySymbol: string;
  deskLanguage?: DeskLanguageMode;
}

export type DeskLanguageMode =
  | "BILINGUAL_ZH_FIRST"
  | "BILINGUAL_EN_FIRST"
  | "ONLY_ZH"
  | "ONLY_EN";

// ----------------------------------------------------------------
// Server action response wrapper
// ----------------------------------------------------------------
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ExpenseCategory =
  | "STOCK"
  | "RENT"
  | "UTILITIES"
  | "SALARY"
  | "MARKETING"
  | "OTHER";

export interface ExpenseDto {
  id: string;
  title: string;
  category: ExpenseCategory;
  amountCents: number;
  dateStr: string;
  notes: string | null;
  createdAt: string;
}

export interface MonthlyFinancialReportDto {
  year: number;
  month: number;
  monthLabel: string;
  currencySymbol: string;
  currency: string;
  grossSalesCents: number;
  completedOrdersCount: number;
  totalExpensesCents: number;
  expenseCount: number;
  netProfitCents: number;
  profitMarginPercent: number;
  expenseCategories: {
    category: ExpenseCategory;
    labelZh: string;
    labelEn: string;
    icon: string;
    totalCents: number;
    count: number;
    percentage: number;
  }[];
  servicesBreakdown: {
    serviceId: string;
    serviceName: string;
    category: string | null;
    count: number;
    totalCents: number;
  }[];
  expenses: ExpenseDto[];
  dailyBreakdown: {
    dateStr: string;
    dayNum: number;
    salesCents: number;
    expenseCents: number;
    netProfitCents: number;
    ordersCount: number;
  }[];
}

