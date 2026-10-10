import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth";
import { getDeskDailySummary, getDeskAppointments } from "@/actions/desk";
import { getActiveServices } from "@/actions/services";
import { DeskHub } from "@/components/desk/DeskHub";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Salon Desk" };
export const instant = false;

export default async function DeskPage() {
  await connection();
  await requireAdmin();

  const [summaryRes, appointmentsRes, servicesRes] = await Promise.all([
    getDeskDailySummary(),
    getDeskAppointments(),
    getActiveServices(),
  ]);

  const summary = summaryRes.success
    ? summaryRes.data
    : {
        dateStr: new Date().toISOString().slice(0, 10),
        totalSalesCents: 0,
        totalClientsCount: 0,
        completedCount: 0,
        pendingCount: 0,
        yesterdaySalesCents: 0,
        yesterdayCompletedCount: 0,
        monthSalesCents: 0,
        monthCompletedCount: 0,
        monthLabel: "This Month",
        currency: "MYR",
        currencySymbol: "RM",
        deskLanguage: "BILINGUAL_ZH_FIRST" as const,
        servicesBreakdown: [],
      };

  const appointments = appointmentsRes.success ? appointmentsRes.data : [];
  const services = servicesRes.success ? servicesRes.data : [];
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Salon Desk";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <DeskHub
        initialSummary={summary}
        initialAppointments={appointments}
        services={services}
        businessName={businessName}
      />
    </div>
  );
}
