import type { Metadata } from "next";
import { connection } from "next/server";
import { getMonthlyStatementData } from "@/actions/statement";
import { MonthlyStatementView } from "@/components/admin/MonthlyStatementView";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Reports & Statements | 对账单中心",
};

interface ReportsPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    from?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await connection();
  const params = await searchParams;

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
    />
  );
}
