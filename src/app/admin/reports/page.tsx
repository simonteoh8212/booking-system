import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getMonthlyStatementData } from "@/actions/statement";
import { MonthlyStatementView } from "@/components/admin/MonthlyStatementView";
import { redirect } from "next/navigation";
import type { DeskLanguageMode } from "@/types";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";

export const metadata: Metadata = {
  title: "Statements",
};
export const instant = false;

interface ReportsPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    from?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await connection();
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);

  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);

  const targetYear = params.year ? parseInt(params.year, 10) : undefined;
  const targetMonth = params.month ? parseInt(params.month, 10) : undefined;
  const backHref = params.from === "desk" ? "/admin/desk" : "/admin";

  const res = await getMonthlyStatementData(targetYear, targetMonth, true);

  if (!res.success || !res.data) {
    redirect("/admin");
  }

  return (
    <MonthlyStatementView
      initialData={res.data}
      backHref={backHref}
      initialLanguage={initialLanguage}
    />
  );
}
