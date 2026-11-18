import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getAllBookings, type BookingTimeframe } from "@/actions/admin-bookings";
import { getActiveServices } from "@/actions/services";
import { AdminBookingsManager } from "@/components/admin/AdminBookingsManager";
import { prisma } from "@/lib/prisma";
import type { BookingStatus, DeskLanguageMode } from "@/types";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";

export const metadata: Metadata = { title: "Bookings" };

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

  const [result, depositSetting, servicesRes, cookieStore] = await Promise.all([
    getAllBookings({
      status: statusParam,
      search: searchParam,
      timeframe: timeframeParam,
      pageSize: 100,
    }),
    prisma.depositSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    }),
    getActiveServices(),
    cookies(),
  ]);

  const bookings = result.success ? result.data.bookings : [];
  const counts = result.success
    ? result.data.counts
    : { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
  const services = servicesRes.success ? servicesRes.data : [];
  const currencySymbol = depositSetting?.currencySymbol || "RM";

  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);

  return (
    <AdminBookingsManager
      initialBookings={bookings}
      initialCounts={counts}
      services={services}
      currencySymbol={currencySymbol}
      initialStatus={params.status}
      initialRef={params.ref}
      initialSearch={params.search}
      initialTimeframe={timeframeParam}
      initialLanguage={initialLanguage}
    />
  );
}
