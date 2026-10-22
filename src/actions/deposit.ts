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
  qrImageUrl: null,
  recipientName: "TEOH CHUN SEONG",
  currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "MYR",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM",
  deskLanguage: "BILINGUAL_ZH_FIRST",
  showTodaySales: true,
  showYesterdaySales: true,
  showMonthlySales: true,
  showServiceBreakdown: true,
  showMakeAppointment: true,
  showWalkIn: true,
  showBookedCheckout: true,
};

/**
 * Ensures a single canonical DepositSetting row exists in the database.
 * If multiple rows exist (e.g. from old migrations or separate upserts),
 * keeps the latest updated record and purges orphan duplicates to prevent state desync.
 */
export async function getOrEnsurePrimaryDepositSetting() {
  const all = await prisma.depositSetting.findMany({
    orderBy: { updatedAt: "desc" },
  });

  if (all.length === 0) {
    return await prisma.depositSetting.create({
      data: {
        id: "default",
        currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "MYR",
        currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM",
        deskLanguage: "BILINGUAL_ZH_FIRST",
      },
    });
  }

  // If there are duplicate rows, keep the most recently updated one and purge the rest
  if (all.length > 1) {
    const keeper = all[0];
    await prisma.depositSetting.deleteMany({
      where: { id: { not: keeper.id } },
    });
    return keeper;
  }

  return all[0];
}

/**
 * Fetch current deposit configuration (public or admin).
 */
export async function getDepositSetting(): Promise<ActionResult<DepositSettingDto>> {
  try {
    const setting = await getOrEnsurePrimaryDepositSetting();

    const currency = setting.currency || process.env.NEXT_PUBLIC_CURRENCY_CODE || "MYR";
    const currencySymbol =
      setting.currencySymbol ||
      (currency === "AUD" ? "$" : (process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM"));

    return {
      success: true,
      data: {
        isEnabled: setting.isEnabled,
        type: setting.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: setting.amountCents,
        percentage: setting.percentage,
        duitnowPayload: setting.duitnowPayload ?? DEFAULT_DUITNOW_PAYLOAD,
        qrImageUrl: setting.qrImageUrl ?? null,
        recipientName: setting.recipientName ?? "TEOH CHUN SEONG",
        currency,
        currencySymbol,
        deskLanguage: (setting.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST",
        showTodaySales: setting.showTodaySales ?? true,
        showYesterdaySales: setting.showYesterdaySales ?? true,
        showMonthlySales: setting.showMonthlySales ?? true,
        showServiceBreakdown: setting.showServiceBreakdown ?? true,
        showMakeAppointment: setting.showMakeAppointment ?? true,
        showWalkIn: setting.showWalkIn ?? true,
        showBookedCheckout: setting.showBookedCheckout ?? true,
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

    // Find primary canonical row
    const primary = await getOrEnsurePrimaryDepositSetting();

    const updated = await prisma.depositSetting.update({
      where: { id: primary.id },
      data: {
        isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : false,
        type: input.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: Math.max(100, Math.round(Number(input.amountCents ?? 1000))),
        percentage: Math.min(100, Math.max(1, Math.round(Number(input.percentage ?? 20)))),
        duitnowPayload: rawPayload,
        qrImageUrl: input.qrImageUrl !== undefined ? input.qrImageUrl : undefined,
        recipientName: recipientName ?? "Merchant",
        currency,
        currencySymbol,
        deskLanguage,
        ...(input.showTodaySales !== undefined && { showTodaySales: Boolean(input.showTodaySales) }),
        ...(input.showYesterdaySales !== undefined && { showYesterdaySales: Boolean(input.showYesterdaySales) }),
        ...(input.showMonthlySales !== undefined && { showMonthlySales: Boolean(input.showMonthlySales) }),
        ...(input.showServiceBreakdown !== undefined && { showServiceBreakdown: Boolean(input.showServiceBreakdown) }),
        ...(input.showMakeAppointment !== undefined && { showMakeAppointment: Boolean(input.showMakeAppointment) }),
        ...(input.showWalkIn !== undefined && { showWalkIn: Boolean(input.showWalkIn) }),
        ...(input.showBookedCheckout !== undefined && { showBookedCheckout: Boolean(input.showBookedCheckout) }),
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/services");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");
    revalidatePath("/");
    revalidatePath("/check-booking");

    return {
      success: true,
      data: {
        isEnabled: updated.isEnabled,
        type: updated.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: updated.amountCents,
        percentage: updated.percentage,
        duitnowPayload: updated.duitnowPayload,
        qrImageUrl: updated.qrImageUrl,
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
    const primary = await getOrEnsurePrimaryDepositSetting();
    const updated = await prisma.depositSetting.update({
      where: { id: primary.id },
      data: { deskLanguage: mode },
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
    const primary = await getOrEnsurePrimaryDepositSetting();

    const updated = await prisma.depositSetting.update({
      where: { id: primary.id },
      data: { currency, currencySymbol },
    });

    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/services");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/check-booking");

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

/**
 * Update Desk Hub scoreboard & breakdown visibility toggles
 */
export async function updateDeskScoreboardSettings(input: {
  showTodaySales?: boolean;
  showYesterdaySales?: boolean;
  showMonthlySales?: boolean;
  showServiceBreakdown?: boolean;
  showMakeAppointment?: boolean;
  showWalkIn?: boolean;
  showBookedCheckout?: boolean;
}): Promise<ActionResult<DepositSettingDto>> {
  await requireAdmin();

  try {
    const primary = await getOrEnsurePrimaryDepositSetting();

    // Enforce business rule: Either Walk-in or Booked checkout must be shown; cannot both be false
    const finalWalkIn =
      input.showWalkIn !== undefined
        ? Boolean(input.showWalkIn)
        : (primary.showWalkIn ?? true);
    const finalBookedCheckout =
      input.showBookedCheckout !== undefined
        ? Boolean(input.showBookedCheckout)
        : (primary.showBookedCheckout ?? true);

    if (!finalWalkIn && !finalBookedCheckout) {
      return {
        success: false,
        error:
          "Cannot hide both: Either Walk-in or Booked checkout must be shown.",
      };
    }

    const updated = await prisma.depositSetting.update({
      where: { id: primary.id },
      data: {
        ...(input.showTodaySales !== undefined && { showTodaySales: Boolean(input.showTodaySales) }),
        ...(input.showYesterdaySales !== undefined && { showYesterdaySales: Boolean(input.showYesterdaySales) }),
        ...(input.showMonthlySales !== undefined && { showMonthlySales: Boolean(input.showMonthlySales) }),
        ...(input.showServiceBreakdown !== undefined && { showServiceBreakdown: Boolean(input.showServiceBreakdown) }),
        ...(input.showMakeAppointment !== undefined && { showMakeAppointment: Boolean(input.showMakeAppointment) }),
        ...(input.showWalkIn !== undefined && { showWalkIn: Boolean(input.showWalkIn) }),
        ...(input.showBookedCheckout !== undefined && { showBookedCheckout: Boolean(input.showBookedCheckout) }),
      },
    });

    revalidatePath("/admin/desk", "page");
    revalidatePath("/admin/desk");
    revalidatePath("/admin/settings");

    return {
      success: true,
      data: {
        isEnabled: updated.isEnabled,
        type: updated.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        amountCents: updated.amountCents,
        percentage: updated.percentage,
        duitnowPayload: updated.duitnowPayload ?? DEFAULT_DUITNOW_PAYLOAD,
        qrImageUrl: updated.qrImageUrl ?? null,
        recipientName: updated.recipientName ?? "Merchant",
        currency: updated.currency,
        currencySymbol: updated.currencySymbol,
        deskLanguage: (updated.deskLanguage as DeskLanguageMode) || "BILINGUAL_ZH_FIRST",
        showTodaySales: updated.showTodaySales ?? true,
        showYesterdaySales: updated.showYesterdaySales ?? true,
        showMonthlySales: updated.showMonthlySales ?? true,
        showServiceBreakdown: updated.showServiceBreakdown ?? true,
        showMakeAppointment: updated.showMakeAppointment ?? true,
        showWalkIn: updated.showWalkIn ?? true,
        showBookedCheckout: updated.showBookedCheckout ?? true,
      },
    };
  } catch (error) {
    console.error("[updateDeskScoreboardSettings]", error);
    return { success: false, error: "Failed to update scoreboard display settings." };
  }
}
