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
  type?: string; // "SERVICE" | "PRODUCT"
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
  qrImageUrl?: string | null;
  recipientName?: string | null;
  whatsappUrl: string;
  holdExpiresAt?: string; // ISO
  isDepositExempt?: boolean;
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
  qrImageUrl?: string | null;
  recipientName: string | null;
  currency: string;
  currencySymbol: string;
  deskLanguage?: DeskLanguageMode;
  showTodaySales?: boolean;
  showYesterdaySales?: boolean;
  showMonthlySales?: boolean;
  showServiceBreakdown?: boolean;
  showMakeAppointment?: boolean;
  showWalkIn?: boolean;
  showBookedCheckout?: boolean;
  requireReportPin?: boolean;
}

export interface DepositExemptCustomerDto {
  id: string;
  phoneNumber: string;
  name: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

// ----------------------------------------------------------------
// Member, Credit & Promo Package DTOs
// ----------------------------------------------------------------
export interface PromoBoundMemberDto {
  memberPackageId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  remainingSessions: number;
  totalSessions: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PromoPackageDto {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalSessions: number;
  serviceIds: string[];
  validityMonths: number | null;
  isActive: boolean;
  boundCount?: number;
  activeBoundCount?: number;
  boundMembers?: PromoBoundMemberDto[];
  createdAt: string;
}

export interface MemberPackageDto {
  id: string;
  customerId: string;
  promoPackageId: string | null;
  name: string;
  serviceIds: string[];
  totalSessions: number;
  remainingSessions: number;
  pricePaidCents: number;
  paymentMethod: string | null;
  expiresAt: string | null;
  status: string; // "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED"
  notes: string | null;
  createdAt: string;
}

export interface MemberTransactionDto {
  id: string;
  customerId: string;
  memberPackageId: string | null;
  bookingId: string | null;
  type: string; // "CREDIT_RELOAD" | "CREDIT_DEDUCT" | "PACKAGE_PURCHASE" | "PACKAGE_DEDUCT" | "MANUAL_ADJUST"
  creditChangeCents: number;
  balanceAfterCents: number;
  sessionsChange: number;
  sessionsAfter: number | null;
  cashPaidCents: number;
  paymentMethod: string | null;
  description: string;
  createdAt: string;
}

export interface MemberPurchaseHistoryItemDto {
  id: string;
  referenceCode: string;
  dateIso: string;
  status: BookingStatus;
  totalCashPaidCents: number;
  creditUsedCents: number;
  promoDiscountCents: number;
  notes: string | null;
  items: {
    id: string;
    serviceId: string;
    serviceName: string;
    itemType: string;
    priceCents: number;
    originalPriceCents: number | null;
    memberPackageId: string | null;
    memberPackageName: string | null;
  }[];
}

export interface MemberDto {
  id: string;
  name: string;
  phoneNumber: string;
  isMember: boolean;
  creditBalanceCents: number;
  notes: string | null;
  memberSince: string | null;
  createdAt: string;
  updatedAt: string;
  activePackages: MemberPackageDto[];
  totalVisitsCount: number;
  totalSpentCents: number;
}

export interface MemberDetailDto extends MemberDto {
  allPackages: MemberPackageDto[];
  transactions: MemberTransactionDto[];
  purchaseHistory: MemberPurchaseHistoryItemDto[];
}

