import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getBookings } from "@/actions/admin-bookings";
import { getDeskDailySummary } from "@/actions/desk";
import { AgendaView } from "@/components/admin/AgendaView";
import { SalesOverviewCards } from "@/components/admin/SalesOverviewCards";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await connection();
  const today = new Date();
  const rangeStart = startOfWeek(startOfMonth(today), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 0 });

  const [bookingsRes, summaryRes, cookieStore] = await Promise.all([
    getBookings(rangeStart.toISOString(), rangeEnd.toISOString()),
    getDeskDailySummary(),
    cookies(),
  ]);

  const cookieLang = cookieStore.get("app_desk_language")?.value as
    | DeskLanguageMode
    | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);

  const bookings = bookingsRes.success ? bookingsRes.data : [];
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
        deskLanguage: "ONLY_EN" as const,
        showTodaySales: true,
        showYesterdaySales: true,
        showMonthlySales: true,
        showServiceBreakdown: true,
        showMakeAppointment: true,
        showWalkIn: true,
        showBookedCheckout: true,
        requireReportPin: true,
        servicesBreakdown: [],
      };
  return (
    <div className="space-y-8">
      {/* Top Sales KPI Cards: Today, Yesterday, Monthly */}
      <SalesOverviewCards summary={summary} initialLanguage={initialLanguage} />

      {/* Appointment Agenda */}
      <AgendaView
        initialDate={today.toISOString()}
        initialBookings={bookings}
        currencySymbol={summary.currencySymbol || "RM"}
        initialLanguage={initialLanguage}
      />
    </div>
  );
}
