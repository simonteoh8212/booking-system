import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production"
);

export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 15; // Renew when < 15 days left

export const TRUSTED_DEVICE_COOKIE_NAME = "admin_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export interface JWTPayload {
  sub: string; // adminUser.id
  username: string;
  purpose?: "session" | "trusted_device";
  exp?: number;
}

export async function signSessionJwt(payload: {
  sub: string;
  username: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    username: payload.username,
    purpose: "session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifySessionJwt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const typed = payload as unknown as JWTPayload;
    if (!typed.sub || !typed.username) return null;
    if (typed.purpose && typed.purpose !== "session") return null;
    return typed;
  } catch {
    return null;
  }
}

export async function signTrustedDeviceJwt(payload: {
  sub: string;
  username: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    username: payload.username,
    purpose: "trusted_device",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TRUSTED_DEVICE_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyTrustedDeviceJwt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const typed = payload as unknown as JWTPayload;
    if (!typed.sub || !typed.username) return null;
    if (typed.purpose !== "trusted_device") return null;
    return typed;
  } catch {
    return null;
  }
}
