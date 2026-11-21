"use server";

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
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
import { revalidatePath, updateTag } from "next/cache";
import { getOrEnsurePrimaryDepositSetting } from "./deposit";
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

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRecoveryCode(): string {
  const bytes = randomBytes(12);
  let raw = "";
  for (let i = 0; i < 12; i++) {
    raw += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, "");
}

// ----------------------------------------------------------------
// Recovery Code & Password Management
// ----------------------------------------------------------------
export async function getRecoveryCodeStatus(): Promise<
  ActionResult<{ hasRecoveryCode: boolean }>
> {
  const session = await requireAdmin();
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
      select: { recoveryCodeHash: true },
    });
    return {
      success: true,
      data: { hasRecoveryCode: Boolean(admin?.recoveryCodeHash) },
    };
  } catch (error) {
    console.error("[getRecoveryCodeStatus]", error);
    return { success: false, error: "Failed to load recovery code status." };
  }
}

export async function regenerateRecoveryCode(): Promise<
  ActionResult<{ recoveryCode: string }>
> {
  const session = await requireAdmin();
  try {
    const code = generateRecoveryCode();
    const recoveryCodeHash = await bcrypt.hash(normalizeRecoveryCode(code), 12);

    await prisma.adminUser.update({
      where: { id: session.sub },
      data: { recoveryCodeHash },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { recoveryCode: code } };
  } catch (error) {
    console.error("[regenerateRecoveryCode]", error);
    return { success: false, error: "Failed to generate recovery code." };
  }
}

export async function updateAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<{ initialRecoveryCode?: string }>> {
  const session = await requireAdmin();
  try {
    const { currentPassword, newPassword } = input;
    if (!currentPassword) {
      return { success: false, error: "Current password is required." };
    }
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters.",
      };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    if (!admin) {
      return { success: false, error: "Admin account not found." };
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    let initialRecoveryCode: string | undefined;
    let recoveryCodeHash = admin.recoveryCodeHash;

    if (!recoveryCodeHash) {
      initialRecoveryCode = generateRecoveryCode();
      recoveryCodeHash = await bcrypt.hash(
        normalizeRecoveryCode(initialRecoveryCode),
        12
      );
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash, recoveryCodeHash },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { initialRecoveryCode } };
  } catch (error) {
    console.error("[updateAdminPassword]", error);
    return { success: false, error: "Failed to update password." };
  }
}

export async function resetPasswordWithRecoveryCode(input: {
  username: string;
  recoveryCode: string;
  newPassword: string;
}): Promise<ActionResult<{ newRecoveryCode: string }>> {
  try {
    const cleanUsername = input.username.trim();
    const normalizedCode = normalizeRecoveryCode(input.recoveryCode);
    const newPassword = input.newPassword;

    if (!cleanUsername) {
      return { success: false, error: "Username is required." };
    }
    if (!normalizedCode || normalizedCode.length < 8) {
      return { success: false, error: "Please enter a valid recovery code." };
    }
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters.",
      };
    }

    const clientIp = await getRequestClientIp();
    const rateKey = `admin-recovery:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many recovery attempts. Please wait ${rateCheck.retryAfterSeconds}s and try again.`,
      };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username: cleanUsername },
    });

    if (!admin || !admin.recoveryCodeHash) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Invalid username or recovery code." };
    }

    const validCode = await bcrypt.compare(normalizedCode, admin.recoveryCodeHash);
    if (!validCode) {
      recordFailedLookup(rateKey);
      return { success: false, error: "Invalid username or recovery code." };
    }

    // Rotate password and issue a fresh one-time recovery code immediately
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const newRecoveryCode = generateRecoveryCode();
    const newRecoveryCodeHash = await bcrypt.hash(
      normalizeRecoveryCode(newRecoveryCode),
      12
    );

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        recoveryCodeHash: newRecoveryCodeHash,
      },
    });

    recordSuccessfulLookup(rateKey);
    await signAndSetSession({ sub: admin.id, username: admin.username });
    await setTrustedDeviceCookie({ sub: admin.id, username: admin.username });

    return { success: true, data: { newRecoveryCode } };
  } catch (error) {
    console.error("[resetPasswordWithRecoveryCode]", error);
    return {
      success: false,
      error: "Failed to reset password. Please try again.",
    };
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
// Toggle Monthly Financial Report 4-Digit PIN Requirement
// ----------------------------------------------------------------
export async function updateReportPinRequirement(input: {
  requirePin: boolean;
  password?: string;
}): Promise<ActionResult<{ requireReportPin: boolean }>> {
  const session = await requireAdmin();
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    if (!admin) {
      return { success: false, error: "Admin user not found." };
    }

    if (input.requirePin) {
      if (!admin.pinCode || !/^\d{4}$/.test(admin.pinCode)) {
        return {
          success: false,
          error: "Please set a 4-digit PIN first before enabling report lock.",
        };
      }
    } else {
      const password = input.password?.trim() ? input.password : "";
      if (!password) {
        return {
          success: false,
          error: "Please enter your account password to disable PIN lock.",
        };
      }

      const clientIp = await getRequestClientIp();
      const rateKey = `report-pin-toggle:${session.sub}:${clientIp}`;
      const rateCheck = checkRateLimit(rateKey, 6, 5 * 60 * 1000);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Too many failed attempts. Please wait ${rateCheck.retryAfterSeconds}s and try again.`,
        };
      }

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        recordFailedLookup(rateKey);
        return {
          success: false,
          error: "Incorrect account password.",
        };
      }

      recordSuccessfulLookup(rateKey);
    }

    const primary = await getOrEnsurePrimaryDepositSetting();
    const updated = await prisma.depositSetting.update({
      where: { id: primary.id },
      data: { requireReportPin: Boolean(input.requirePin) },
    });

    updateTag("deposit-setting");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");

    return {
      success: true,
      data: { requireReportPin: updated.requireReportPin },
    };
  } catch (error) {
    console.error("[updateReportPinRequirement]", error);
    return {
      success: false,
      error: "Failed to update report PIN lock setting.",
    };
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
