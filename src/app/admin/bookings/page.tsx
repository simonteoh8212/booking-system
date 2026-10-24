import type { Metadata } from "next";
import { getAllBookings, type BookingTimeframe } from "@/actions/admin-bookings";
import { AdminBookingsManager } from "@/components/admin/AdminBookingsManager";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import type { BookingStatus } from "@/types";

export const metadata: Metadata = { title: "All Bookings" };

interface BookingsPageProps {
  searchParams?: Promise<{
    status?: string;
    ref?: string;
    search?: string;
    timeframe?: string;
  }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  await connection();
  const params = searchParams ? await searchParams : {};
  const statusParam = params.status as BookingStatus | "ALL" | undefined;
  const searchParam = params.search || params.ref || undefined;
  const timeframeParam = (params.timeframe as BookingTimeframe) || "6_MONTHS";

  const [result, depositSetting] = await Promise.all([
    getAllBookings({
      status: statusParam,
      search: searchParam,
      timeframe: timeframeParam,
      pageSize: 100,
    }),
    prisma.depositSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const bookings = result.success ? result.data.bookings : [];
  const counts = result.success
    ? result.data.counts
    : { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };

  const currencySymbol = "RM";

  return (
    <AdminBookingsManager
      initialBookings={bookings}
      initialCounts={counts}
      currencySymbol={currencySymbol}
      initialStatus={params.status}
      initialRef={params.ref}
      initialSearch={params.search}
      initialTimeframe={timeframeParam}
    />
  );
}
