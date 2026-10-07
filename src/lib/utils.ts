import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a short, uppercase booking reference code like BK-8F29A.
 */
export function generateReferenceCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return `BK-${random}`;
}

/**
 * Format a price in cents to a currency string (MYR).
 */
export function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
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
