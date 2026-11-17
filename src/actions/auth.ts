"use server";

import { prisma } from "@/lib/prisma";
import {
  signAndSetSession,
  clearSession,
  verifySession,
  setTrustedDeviceCookie,
  verifyTrustedDeviceCookie,
  clearTrustedDeviceCookie,
  timingSafeSecretEqual,
  getRequestClientIp,
} from "@/lib/auth";
import {
  checkRateLimit,
  recordFailedLookup,
  recordSuccessfulLookup,
} from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------
// Admin login (Username & Password)
// ----------------------------------------------------------------
interface LoginInput {
  username: string;
  password: string;
}

export async function adminLogin(
  input: LoginInput
): Promise<ActionResult<void>> {
  const { username, password } = input;

  try {
    const clientIp = await getRequestClientIp();
    const rateKey = `admin-login:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 10, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds}s and try again.`,
      };
    }

    const admin = await prisma.adminUser.findUnique({ where: { username } });

    if (!admin) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Invalid credentials." };
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Invalid credentials." };
    }

    recordSuccessfulLookup(rateKey);
    await signAndSetSession({ sub: admin.id, username: admin.username });
    await setTrustedDeviceCookie({ sub: admin.id, username: admin.username });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("[adminLogin]", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        error: "Missing DATABASE_URL in environment variables.",
      };
    }
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      return {
        success: false,
        error: "Cannot connect to database. Ensure DATABASE_URL is reachable.",
      };
    }
    return { success: false, error: "Login failed. Please check server logs or try again." };
  }
}

// ----------------------------------------------------------------
// Admin PIN login (Trusted-device 4-digit PIN unlock, rate limited)
// ----------------------------------------------------------------
export async function adminPinLogin(pin: string): Promise<ActionResult<void>> {
  try {
    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: "Please enter a 4-digit PIN." };
    }

    const clientIp = await getRequestClientIp();
    const rateKey = `admin-pin:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 5, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many PIN attempts. Wait ${rateCheck.retryAfterSeconds}s or sign in with password.`,
      };
    }

    const trusted = await verifyTrustedDeviceCookie();
    if (!trusted) {
      return {
        success: false,
        error: "Please sign in with username & password once on this device to enable PIN unlock.",
      };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: trusted.sub },
    });

    if (!admin) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Account not found. Sign in with password." };
    }

    if (!admin.pinCode) {
      return {
        success: false,
        error: "Passcode PIN is not set. Sign in with password and set a PIN in Settings.",
      };
    }

    if (!timingSafeSecretEqual(cleanPin, admin.pinCode)) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Incorrect PIN code. Please try again." };
    }

    recordSuccessfulLookup(rateKey);
    await signAndSetSession({ sub: admin.id, username: admin.username });
    await setTrustedDeviceCookie({ sub: admin.id, username: admin.username });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[adminPinLogin]", error);
    return { success: false, error: "Failed to sign in. Please try again." };
  }
}

// ----------------------------------------------------------------
// Get & Update Admin PIN
// ----------------------------------------------------------------
export async function getAdminPin(): Promise<ActionResult<string>> {
  const session = await requireAdmin();
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    return { success: true, data: admin?.pinCode ?? "" };
  } catch (error) {
    console.error("[getAdminPin]", error);
    return { success: false, error: "Failed to load PIN." };
  }
}

export async function updateAdminPin(newPin: string): Promise<ActionResult<void>> {
  const session = await requireAdmin();
  try {
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: "PIN must be exactly 4 digits." };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    if (!admin) return { success: false, error: "Admin not found." };

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { pinCode: cleanPin },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateAdminPin]", error);
    return { success: false, error: "Failed to update PIN." };
  }
}

// ----------------------------------------------------------------
// Admin logout / Lock Desk
// ----------------------------------------------------------------
export async function adminLogout(): Promise<ActionResult<void>> {
  try {
    await clearSession();
    await clearTrustedDeviceCookie();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[adminLogout]", error);
    return { success: false, error: "Logout failed" };
  }
}

export async function lockDeskSession(): Promise<void> {
  // Clears active session only — keeps trusted-device cookie so owner/staff can unlock with PIN
  await clearSession();
  redirect("/admin/login?from=/admin/desk");
}

// ----------------------------------------------------------------
// Guard — ensure caller is an authenticated admin
// (call this at the top of admin server actions)
// ----------------------------------------------------------------
export async function requireAdmin() {
  const session = await verifySession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}
