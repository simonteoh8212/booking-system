import type { Metadata } from "next";
import { getBookings } from "@/actions/admin-bookings";
import { AgendaView } from "@/components/admin/AgendaView";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await connection();
  const today = new Date();
  const rangeStart = startOfWeek(startOfMonth(today), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 0 });

  const result = await getBookings(
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );
  const bookings = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Today&apos;s appointment agenda
        </p>
      </div>

      <AgendaView
        initialDate={today.toISOString()}
        initialBookings={bookings}
      />
    </div>
  );
}
