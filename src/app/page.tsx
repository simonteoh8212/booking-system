import type { Metadata } from "next";
import Link from "next/link";
import { getActiveServices } from "@/actions/services";
import { BookingFunnel } from "@/components/booking/BookingFunnel";
import { CalendarDays, Search } from "lucide-react";

import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a service and book your appointment online in minutes.",
};

export default async function BookingPage() {
  await connection();
  const result = await getActiveServices();
  const services = result.success ? result.data : [];

  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Our Salon";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">{businessName}</h1>
              <p className="text-xs text-muted-foreground">Online Booking</p>
            </div>
          </div>
          <Link
            href="/check-booking"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors border"
          >
            <Search className="h-3.5 w-3.5 text-primary" />
            Check Booking
          </Link>
        </div>
      </header>

      {/* Booking funnel */}
      <main>
        {services.length === 0 ? (
          <div className="max-w-md mx-auto px-4 py-16 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No services available right now.</p>
            <p className="text-sm">Please check back later or contact us directly.</p>
          </div>
        ) : (
          <BookingFunnel services={services} />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground pb-8 mt-4 space-y-2">
        <p>
          <Link href="/check-booking" className="hover:underline text-primary font-medium">
            Track an existing booking
          </Link>
        </p>
        <p>Secure booking powered by BookEase</p>
      </footer>
    </div>
  );
}
