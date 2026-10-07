import type { Metadata } from "next";
import { getBookings } from "@/actions/admin-bookings";
import { AgendaView } from "@/components/admin/AgendaView";
import { startOfDay, endOfDay } from "date-fns";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await connection();
  const today = new Date();
  const result = await getBookings(
    startOfDay(today).toISOString(),
    endOfDay(today).toISOString()
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
