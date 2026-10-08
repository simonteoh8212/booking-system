interface RateLimitRecord {
  timestamps: number[];
  failedAttempts: number;
  blockedUntil?: number;
}

// In-memory store for tracking IP request volume and failed lookups
const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxAge);
      if (
        record.timestamps.length === 0 &&
        (!record.blockedUntil || record.blockedUntil < now)
      ) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent interval from keeping Node.js process alive during testing/build
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Check if a request identifier (e.g. IP) has exceeded rate limits.
 * Default: Max 6 lookups per minute.
 */
export function checkRateLimit(
  identifier: string,
  limit = 6,
  windowMs = 60 * 1000
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  let record = memoryStore.get(identifier);

  if (!record) {
    record = { timestamps: [], failedAttempts: 0 };
    memoryStore.set(identifier, record);
  }

  // If IP is temporarily locked due to repeated non-existent code guessing
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Filter timestamps to the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  record.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Record a failed search (e.g. guessing non-existent booking codes).
 * After 4 failed attempts, temporarily lock this IP for 3 minutes.
 */
export function recordFailedLookup(identifier: string) {
  const now = Date.now();
  const record = memoryStore.get(identifier);
  if (!record) return;

  record.failedAttempts += 1;

  if (record.failedAttempts >= 4) {
    record.blockedUntil = now + 3 * 60 * 1000; // 3-minute cooldown
  }
}

/**
 * Reset failed attempt strikes upon a successful valid lookup.
 */
export function recordSuccessfulLookup(identifier: string) {
  const record = memoryStore.get(identifier);
  if (record) {
    record.failedAttempts = 0;
  }
}
