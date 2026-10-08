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
// Admin logout
// ----------------------------------------------------------------
export async function adminLogout(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
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
