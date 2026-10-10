"use server";

import { prisma } from "@/lib/prisma";
import { signAndSetSession, clearSession } from "@/lib/auth";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------
// Admin login
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
    const admin = await prisma.adminUser.findUnique({ where: { username } });

    if (!admin) {
      return { success: false, error: "Invalid credentials." };
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid credentials." };
    }

    await signAndSetSession({ sub: admin.id, username: admin.username });
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
        error: "Cannot connect to database. Ensure DATABASE_URL uses the Supabase connection pooler.",
      };
    }
    return { success: false, error: "Login failed. Please check server logs or try again." };
  }
}

// ----------------------------------------------------------------
// Admin PIN login (iPhone-style 4-digit PIN for Desk POS)
// ----------------------------------------------------------------
export async function adminPinLogin(pin: string): Promise<ActionResult<void>> {
  try {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, error: "Please enter a 4-digit PIN." };
    }

    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!admin) {
      return { success: false, error: "No admin user found." };
    }

    const validPin = admin.pinCode || "1234";
    if (cleanPin !== validPin) {
      return { success: false, error: "Incorrect PIN code. Please try again." };
    }

    await signAndSetSession({ sub: admin.id, username: admin.username });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[adminPinLogin]", error);
    return { success: false, error: "Failed to sign in. Please try again." };
  }
}

// ----------------------------------------------------------------
// Update Admin PIN
// ----------------------------------------------------------------
export async function updateAdminPin(newPin: string): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: "PIN must be exactly 4 digits." };
    }

    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!admin) return { success: false, error: "Admin not found." };

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { pinCode: cleanPin },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateAdminPin]", error);
    return { success: false, error: "Failed to update PIN." };
  }
}

// ----------------------------------------------------------------
// Admin logout / Lock Desk
// ----------------------------------------------------------------
export async function adminLogout(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}

export async function lockDeskSession(): Promise<void> {
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
