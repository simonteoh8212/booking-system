import type { Metadata } from "next";
import { getBookings } from "@/actions/admin-bookings";
import { getDeskDailySummary } from "@/actions/desk";
import { AgendaView } from "@/components/admin/AgendaView";
import { SalesOverviewCards } from "@/components/admin/SalesOverviewCards";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await connection();
  const today = new Date();
  const rangeStart = startOfWeek(startOfMonth(today), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 0 });

  const [bookingsRes, summaryRes] = await Promise.all([
    getBookings(rangeStart.toISOString(), rangeEnd.toISOString()),
    getDeskDailySummary(),
  ]);

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
        deskLanguage: "BILINGUAL_ZH_FIRST" as const,
        servicesBreakdown: [],
      };

  return (
    <div className="space-y-8">
      {/* Top Sales KPI Cards: Today, Yesterday, Monthly */}
      <SalesOverviewCards summary={summary} />

      {/* Appointment Agenda */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-bold">Appointment Agenda / 今日预约日程</h2>
          <p className="text-muted-foreground text-xs">
            Review slot schedule and customer bookings
          </p>
        </div>

        <AgendaView
          initialDate={today.toISOString()}
          initialBookings={bookings}
          currencySymbol={summary.currencySymbol || "RM"}
        />
      </div>
    </div>
  );
}
