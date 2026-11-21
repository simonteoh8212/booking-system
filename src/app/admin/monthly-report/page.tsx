import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { requireAdmin } from "@/actions/auth";
import { getDepositSetting } from "@/actions/deposit";
import { MonthlyReportPageClient } from "@/components/admin/MonthlyReportPageClient";
import type { DeskLanguageMode } from "@/types";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";

export const metadata: Metadata = {
  title: "Monthly Report",
};
export const instant = false;

export default async function MonthlyReportPage() {
  await connection();
  await requireAdmin();

  const [depositRes, cookieStore] = await Promise.all([
    getDepositSetting(),
    cookies(),
  ]);

  const setting = depositRes.success ? depositRes.data : null;
  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(
    cookieLang || setting?.deskLanguage
  );

  return (
    <MonthlyReportPageClient
      currencySymbol={setting?.currencySymbol || "RM"}
      initialLanguage={initialLanguage}
      requireReportPin={setting?.requireReportPin ?? true}
    />
  );
}
