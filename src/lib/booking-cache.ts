import type { CustomerBookingLookupDto } from "@/types";

interface CacheEntry {
  data: CustomerBookingLookupDto;
  cachedAt: number;
}

// In-memory cache stores
const cacheByRef = new Map<string, CacheEntry>();
const cacheByPhone = new Map<string, CacheEntry>();

const MAX_CACHE_ENTRIES = 5000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours max TTL if never invalidated

/**
 * Get cached booking status if available.
 * Returns null if cache miss or expired.
 */
export function getBookingFromCache(
  query: string
): CustomerBookingLookupDto | null {
  const normalized = query.trim().toUpperCase();
  const cleanPhone = query.replace(/\D/g, "");
  const now = Date.now();

  // 1. Check by reference code
  const refEntry = cacheByRef.get(normalized);
  if (refEntry) {
    if (now - refEntry.cachedAt < TTL_MS) {
      return refEntry.data;
    }
    cacheByRef.delete(normalized);
  }

  // 2. Check by phone number
  if (cleanPhone.length >= 9) {
    const phoneEntry = cacheByPhone.get(cleanPhone);
    if (phoneEntry) {
      if (now - phoneEntry.cachedAt < TTL_MS) {
        return phoneEntry.data;
      }
      cacheByPhone.delete(cleanPhone);
    }
  }

  return null;
}

/**
 * Cache booking status for fast subsequent lookups.
 */
export function saveBookingToCache(
  dto: CustomerBookingLookupDto,
  rawPhone?: string
) {
  const entry: CacheEntry = {
    data: dto,
    cachedAt: Date.now(),
  };

  // Limit memory growth
  if (cacheByRef.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cacheByRef.keys().next().value;
    if (firstKey) cacheByRef.delete(firstKey);
  }

  const refKey = dto.referenceCode.trim().toUpperCase();
  cacheByRef.set(refKey, entry);

  if (rawPhone) {
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length >= 9) {
      if (cacheByPhone.size >= MAX_CACHE_ENTRIES) {
        const firstPhoneKey = cacheByPhone.keys().next().value;
        if (firstPhoneKey) cacheByPhone.delete(firstPhoneKey);
      }
      cacheByPhone.set(cleanPhone, entry);
    }
  }
}

/**
 * Invalidate cached booking on-demand (called whenever admin changes status
 * or customer submits payment receipt).
 */
export function invalidateBookingCache(
  referenceCode: string,
  phoneNumber?: string
) {
  const refKey = referenceCode.trim().toUpperCase();
  cacheByRef.delete(refKey);

  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone) {
      cacheByPhone.delete(cleanPhone);
    }
  }
}
