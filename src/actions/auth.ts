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
  } catch (error) {
    console.error("[adminLogin]", error);
    return { success: false, error: "Login failed. Please try again." };
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
