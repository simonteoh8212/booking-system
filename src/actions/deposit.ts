"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_DUITNOW_PAYLOAD,
  parseDuitNowPayload,
  generateDuitNowQRDataUrl,
} from "@/lib/duitnow";
import type { ActionResult, DepositSettingDto } from "@/types";

const DEFAULT_SETTING: DepositSettingDto = {
  isEnabled: false,
  type: "FIXED",
  amountCents: 1000, // RM10.00
  percentage: 20,    // 20%
  duitnowPayload: DEFAULT_DUITNOW_PAYLOAD,
  recipientName: "TEOH CHUN SEONG",
};

/**
 * Fetch current deposit configuration (public or admin).
 */
export async function getDepositSetting(): Promise<ActionResult<DepositSettingDto>> {
  try {
    const setting = await prisma.depositSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      return { success: true, data: DEFAULT_SETTING };
    }

    return {
      success: true,
      data: {
        isEnabled: setting.isEnabled,
        type: setting.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: setting.amountCents,
        percentage: setting.percentage,
        duitnowPayload: setting.duitnowPayload ?? DEFAULT_DUITNOW_PAYLOAD,
        recipientName: setting.recipientName ?? "TEOH CHUN SEONG",
      },
    };
  } catch (error) {
    console.error("[getDepositSetting]", error);
    return { success: false, error: "Failed to fetch deposit settings." };
  }
}

/**
 * Update deposit configuration (Admin only).
 */
export async function updateDepositSetting(
  input: Partial<DepositSettingDto>
): Promise<ActionResult<DepositSettingDto>> {
  await requireAdmin();

  try {
    const rawPayload = input.duitnowPayload?.trim() || DEFAULT_DUITNOW_PAYLOAD;
    const parsed = parseDuitNowPayload(rawPayload);

    let recipientName = input.recipientName?.trim() || null;
    if (parsed.isValid && parsed.recipientName) {
      recipientName = parsed.recipientName;
    }

    const updated = await prisma.depositSetting.upsert({
      where: { id: "default" },
      update: {
        isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : false,
        type: input.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: Math.max(100, Math.round(Number(input.amountCents ?? 1000))),
        percentage: Math.min(100, Math.max(1, Math.round(Number(input.percentage ?? 20)))),
        duitnowPayload: rawPayload,
        recipientName: recipientName ?? "Merchant",
      },
      create: {
        id: "default",
        isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : false,
        type: input.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: Math.max(100, Math.round(Number(input.amountCents ?? 1000))),
        percentage: Math.min(100, Math.max(1, Math.round(Number(input.percentage ?? 20)))),
        duitnowPayload: rawPayload,
        recipientName: recipientName ?? "Merchant",
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/");

    return {
      success: true,
      data: {
        isEnabled: updated.isEnabled,
        type: updated.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: updated.amountCents,
        percentage: updated.percentage,
        duitnowPayload: updated.duitnowPayload,
        recipientName: updated.recipientName,
      },
    };
  } catch (error) {
    console.error("[updateDepositSetting]", error);
    return { success: false, error: "Failed to save deposit settings." };
  }
}

/**
 * Generate preview QR Data URL for admin settings.
 */
export async function getPreviewDepositQR(options: {
  basePayload?: string;
  amountCents: number;
}): Promise<ActionResult<string>> {
  try {
    const qr = await generateDuitNowQRDataUrl({
      basePayload: options.basePayload || DEFAULT_DUITNOW_PAYLOAD,
      amountCents: options.amountCents,
      referenceCode: "DEMO-SAMPLE",
    });
    return { success: true, data: qr };
  } catch (error) {
    console.error("[getPreviewDepositQR]", error);
    return { success: false, error: "Failed to generate preview QR." };
  }
}
