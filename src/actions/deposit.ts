"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_DUITNOW_PAYLOAD,
  parseDuitNowPayload,
  generateDuitNowQRDataUrl,
} from "@/lib/duitnow";
import type { ActionResult, DepositSettingDto, DeskLanguageMode } from "@/types";

const DEFAULT_SETTING: DepositSettingDto = {
  isEnabled: false,
  type: "FIXED",
  amountCents: 1000, // RM10.00 or $10.00
  percentage: 20,    // 20%
  duitnowPayload: DEFAULT_DUITNOW_PAYLOAD,
  recipientName: "TEOH CHUN SEONG",
  currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "MYR",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM",
  deskLanguage: "BILINGUAL_ZH_FIRST",
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
        currency: setting.currency || process.env.NEXT_PUBLIC_CURRENCY_CODE || "MYR",
        currencySymbol: setting.currencySymbol || process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM",
        deskLanguage: (setting.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST",
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

    const currency = input.currency === "AUD" ? "AUD" : "MYR";
    const currencySymbol = currency === "AUD" ? "$" : (input.currencySymbol || "RM");
    const deskLanguage = input.deskLanguage || "BILINGUAL_ZH_FIRST";

    const updated = await prisma.depositSetting.upsert({
      where: { id: "default" },
      update: {
        isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : false,
        type: input.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: Math.max(100, Math.round(Number(input.amountCents ?? 1000))),
        percentage: Math.min(100, Math.max(1, Math.round(Number(input.percentage ?? 20)))),
        duitnowPayload: rawPayload,
        recipientName: recipientName ?? "Merchant",
        currency,
        currencySymbol,
        deskLanguage,
      },
      create: {
        id: "default",
        isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : false,
        type: input.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: Math.max(100, Math.round(Number(input.amountCents ?? 1000))),
        percentage: Math.min(100, Math.max(1, Math.round(Number(input.percentage ?? 20)))),
        duitnowPayload: rawPayload,
        recipientName: recipientName ?? "Merchant",
        currency,
        currencySymbol,
        deskLanguage,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");
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
        currency: updated.currency,
        currencySymbol: updated.currencySymbol,
        deskLanguage: (updated.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST",
      },
    };
  } catch (error) {
    console.error("[updateDepositSetting]", error);
    return { success: false, error: "Failed to save deposit settings." };
  }
}

/**
 * Fast direct updater for Desk language mode (used by quick switcher in Desk header)
 */
export async function updateDeskLanguageSetting(
  mode: DeskLanguageMode
): Promise<ActionResult<{ deskLanguage: DeskLanguageMode }>> {
  await requireAdmin();
  try {
    const updated = await prisma.depositSetting.upsert({
      where: { id: "default" },
      update: { deskLanguage: mode },
      create: {
        id: "default",
        deskLanguage: mode,
      },
    });

    revalidatePath("/admin/desk");
    revalidatePath("/admin/settings");

    return {
      success: true,
      data: { deskLanguage: (updated.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST" },
    };
  } catch (error) {
    console.error("[updateDeskLanguageSetting]", error);
    return { success: false, error: "Failed to update desk language" };
  }
}

/**
 * Fast direct updater for Desk currency (used by quick switcher or settings)
 */
export async function updateDeskCurrencySetting(
  currency: "MYR" | "AUD",
  currencySymbol: "RM" | "$"
): Promise<ActionResult<{ currency: string; currencySymbol: string }>> {
  await requireAdmin();
  try {
    const updated = await prisma.depositSetting.upsert({
      where: { id: "default" },
      update: { currency, currencySymbol },
      create: {
        id: "default",
        currency,
        currencySymbol,
      },
    });

    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/settings");
    revalidatePath("/admin");

    return {
      success: true,
      data: {
        currency: updated.currency,
        currencySymbol: updated.currencySymbol,
      },
    };
  } catch (error) {
    console.error("[updateDeskCurrencySetting]", error);
    return { success: false, error: "Failed to update currency setting" };
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
