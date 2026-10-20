"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import { normalizePhoneNumber } from "@/lib/utils";
import type { ActionResult, DepositExemptCustomerDto } from "@/types";

/**
 * Fetch all deposit-exempt regular customers (Admin only).
 */
export async function getDepositExemptCustomers(): Promise<
  ActionResult<DepositExemptCustomerDto[]>
> {
  await requireAdmin();
  try {
    const list = await prisma.depositExemptCustomer.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: list.map((item) => ({
        id: item.id,
        phoneNumber: item.phoneNumber,
        name: item.name,
        note: item.note,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getDepositExemptCustomers]", error);
    return { success: false, error: "Failed to load exempt customers list." };
  }
}

/**
 * Add or update a deposit-exempt customer (Admin only).
 */
export async function addDepositExemptCustomer(input: {
  phoneNumber: string;
  name?: string;
  note?: string;
}): Promise<ActionResult<DepositExemptCustomerDto>> {
  await requireAdmin();
  try {
    const cleanPhone = normalizePhoneNumber(input.phoneNumber);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, error: "Please enter a valid phone number (at least 8 digits)." };
    }

    const item = await prisma.depositExemptCustomer.upsert({
      where: { phoneNumber: cleanPhone },
      update: {
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        isActive: true,
      },
      create: {
        phoneNumber: cleanPhone,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        isActive: true,
      },
    });

    revalidatePath("/admin/settings");

    return {
      success: true,
      data: {
        id: item.id,
        phoneNumber: item.phoneNumber,
        name: item.name,
        note: item.note,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[addDepositExemptCustomer]", error);
    return { success: false, error: "Failed to add regular customer to exemption list." };
  }
}

/**
 * Remove customer from deposit exemption list (Admin only).
 */
export async function removeDepositExemptCustomer(
  id: string
): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    await prisma.depositExemptCustomer.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[removeDepositExemptCustomer]", error);
    return { success: false, error: "Failed to remove customer from list." };
  }
}

/**
 * Toggle exemption status active/inactive (Admin only).
 */
export async function toggleDepositExemptCustomer(
  id: string,
  isActive: boolean
): Promise<ActionResult<DepositExemptCustomerDto>> {
  await requireAdmin();
  try {
    const item = await prisma.depositExemptCustomer.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/admin/settings");

    return {
      success: true,
      data: {
        id: item.id,
        phoneNumber: item.phoneNumber,
        name: item.name,
        note: item.note,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[toggleDepositExemptCustomer]", error);
    return { success: false, error: "Failed to update customer status." };
  }
}

/**
 * Verification module: Check if a given phone number is exempt from paying deposit.
 * Accessible by Admin (and used internally during booking checkout).
 */
export async function verifyPhoneNumberExemption(
  rawPhoneNumber: string
): Promise<
  ActionResult<{
    isExempt: boolean;
    customer: DepositExemptCustomerDto | null;
    normalizedPhone: string;
  }>
> {
  try {
    const normalizedPhone = normalizePhoneNumber(rawPhoneNumber);
    if (!normalizedPhone) {
      return {
        success: true,
        data: { isExempt: false, customer: null, normalizedPhone: "" },
      };
    }

    const matched = await prisma.depositExemptCustomer.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        isActive: true,
      },
    });

    if (matched) {
      return {
        success: true,
        data: {
          isExempt: true,
          normalizedPhone,
          customer: {
            id: matched.id,
            phoneNumber: matched.phoneNumber,
            name: matched.name,
            note: matched.note,
            isActive: matched.isActive,
            createdAt: matched.createdAt.toISOString(),
            updatedAt: matched.updatedAt.toISOString(),
          },
        },
      };
    }

    return {
      success: true,
      data: { isExempt: false, customer: null, normalizedPhone },
    };
  } catch (error) {
    console.error("[verifyPhoneNumberExemption]", error);
    return { success: false, error: "Failed to verify phone number exemption." };
  }
}
