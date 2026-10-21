import type { Metadata } from "next";
import Link from "next/link";
import { getActiveServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { BookingFunnel } from "@/components/booking/BookingFunnel";
import { CustomerLanguageProvider } from "@/components/booking/CustomerLanguageContext";
import { CustomerHeader } from "@/components/booking/CustomerHeader";
import { CalendarDays } from "lucide-react";

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isInternalAppMode } from "@/lib/utils";


export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a service and book your appointment online in minutes.",
};

export default async function BookingPage() {
  if (isInternalAppMode()) {
    redirect("/admin/desk");
  }

  await connection();
  const [servicesResult, depositResult] = await Promise.all([
    getActiveServices(),
    getDepositSetting(),
  ]);

  const services = servicesResult.success ? servicesResult.data : [];
  const currencySymbol = depositResult.success ? depositResult.data.currencySymbol : "RM";
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Our Salon";

  return (
    <CustomerLanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Dynamic Multi-lingual Header with Language Switcher */}
        <CustomerHeader businessName={businessName} />

        {/* Booking funnel */}
        <main>
          {services.length === 0 ? (
            <div className="max-w-md mx-auto px-4 py-16 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No services available right now.</p>
              <p className="text-sm">Please check back later or contact us directly.</p>
            </div>
          ) : (
            <BookingFunnel services={services} currencySymbol={currencySymbol} />
          )}
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pb-8 mt-4 space-y-2">
          <p>
            <Link href="/check-booking" className="hover:underline text-primary font-medium">
              Track an existing booking / 查询已有预约
            </Link>
          </p>
          <p>Secure booking powered by BookEase</p>
        </footer>
      </div>
    </CustomerLanguageProvider>
  );
}
