import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  TRUSTED_DEVICE_COOKIE_NAME,
  TRUSTED_DEVICE_MAX_AGE,
  signSessionJwt,
  verifySessionJwt,
  signTrustedDeviceJwt,
  verifyTrustedDeviceJwt,
  type JWTPayload,
} from "./session-token";
import { extractClientIp } from "./rate-limit";

export type { JWTPayload };

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/**
 * Sign a JWT and set it as an HTTP-only secure cookie (30-day session).
 */
export async function signAndSetSession(payload: {
  sub: string;
  username: string;
}): Promise<void> {
  const token = await signSessionJwt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, buildCookieOptions(SESSION_MAX_AGE));
}

/**
 * Verify the session cookie and return the decoded payload.
 * Returns null if missing or invalid.
 */
export async function verifySession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionJwt(token);
}

/**
 * Clear the session cookie (logout or lock desk).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...buildCookieOptions(0),
    expires: new Date(0),
  });
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Mark this browser/device as trusted for quick 4-digit PIN unlock
 * after a full username + password sign-in.
 */
export async function setTrustedDeviceCookie(payload: {
  sub: string;
  username: string;
}): Promise<void> {
  const token = await signTrustedDeviceJwt(payload);
  const cookieStore = await cookies();
  cookieStore.set(
    TRUSTED_DEVICE_COOKIE_NAME,
    token,
    buildCookieOptions(TRUSTED_DEVICE_MAX_AGE)
  );
}

/**
 * Verify whether this browser/device has been enrolled for PIN unlock.
 */
export async function verifyTrustedDeviceCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyTrustedDeviceJwt(token);
}

/**
 * Remove trusted-device enrollment (called on explicit logout).
 */
export async function clearTrustedDeviceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TRUSTED_DEVICE_COOKIE_NAME, "", {
    ...buildCookieOptions(0),
    expires: new Date(0),
  });
  cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);
}

/**
 * Constant-time string comparison for short secrets such as 4-digit PINs.
 */
export function timingSafeSecretEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Resolve best-effort caller IP for server-action rate limiting.
 */
export async function getRequestClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    return extractClientIp(headersList);
  } catch {
    return "127.0.0.1";
  }
}
