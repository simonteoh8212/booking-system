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
  whatsappUrl: string;
}

// ----------------------------------------------------------------
// Server action response wrapper
// ----------------------------------------------------------------
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

