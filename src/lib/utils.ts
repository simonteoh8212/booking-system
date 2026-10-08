import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a short, uppercase booking reference code like BK-8F29A or SPA-8F29A.
 * The prefix is dynamically loaded from NEXT_PUBLIC_BOOKING_REF_PREFIX in .env (defaults to BK).
 */
export function generateReferenceCode(): string {
  const rawPrefix = (
    process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX ||
    process.env.BOOKING_REF_PREFIX ||
    "BK"
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const prefix = rawPrefix || "BK";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return `${prefix}-${random}`;
}


/**
 * Format a price in cents to a currency string (MYR).
 */
export function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

export const BUSINESS_TIMEZONE = "Asia/Kuala_Lumpur";
export const BUSINESS_TIMEZONE_OFFSET = "+08:00";

/**
 * Convert any date input (ISO string, Date, or YYYY-MM-DD) into a YYYY-MM-DD string
 * in the business timezone (Asia/Kuala_Lumpur).
 */
export function toBusinessDateString(input: string | Date): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
  }).format(d);
}

/**
 * Create a Date object for a given YYYY-MM-DD and HH:mm in the business timezone.
 */
export function createBusinessDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${BUSINESS_TIMEZONE_OFFSET}`);
}

/**
 * Parse "HH:mm" time string and apply it to a given Date object,
 * returning a new Date with that time set in local time.
 */
export function applyTimeToDate(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Round a date up to the next N-minute boundary.
 */
export function roundUpToInterval(date: Date, intervalMinutes: number): Date {
  const ms = intervalMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}
