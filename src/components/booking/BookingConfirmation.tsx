"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MessageCircle, CalendarCheck, Copy, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { getOperatingHoursInfo } from "@/lib/operating-hours";

export function BookingConfirmation() {
  const { confirmation, reset } = useBookingStore();
  const [copied, setCopied] = useState(false);
  const operatingHours = getOperatingHoursInfo();

  if (!confirmation) return null;

  function copyRef() {
    navigator.clipboard.writeText(confirmation!.referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 text-center">
      {/* Success Hero */}
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-green-700">Slot Reserved!</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your appointment is pending payment confirmation.
          </p>
        </div>
      </div>

      {/* Reference code */}
      <div className="flex items-center justify-center gap-2">
        <div className="bg-muted rounded-xl px-5 py-2.5 font-mono text-xl font-bold tracking-widest">
          {confirmation.referenceCode}
        </div>
        <button
          onClick={copyRef}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Copy reference code"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {copied && <p className="text-xs text-green-600 -mt-3">Copied!</p>}

      {/* Appointment details */}
      <Card>
        <CardContent className="p-5 text-left space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Appointment Details</h3>
          </div>
          <Separator />
          <div className="space-y-2 text-sm pt-1">
            {[
              { label: "Name", value: confirmation.customerName },
              { label: "Service", value: confirmation.serviceName },
              {
                label: "Date",
                value: format(new Date(confirmation.startDatetime), "EEEE, d MMMM yyyy"),
              },
              {
                label: "Time",
                value: format(new Date(confirmation.startDatetime), "h:mm a"),
              },
              {
                label: "Total",
                value: formatPrice(confirmation.totalPriceCents),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation & Operating Hours Notice */}
      {operatingHours.isOutside ? (
        <Card className="bg-indigo-50/80 border-indigo-200 text-left dark:bg-indigo-950/20 dark:border-indigo-800">
          <CardContent className="p-4 space-y-1.5">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-1.5">
              🌙 Slot Locked & Reserved!
            </h4>
            <p className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed">
              You submitted your booking outside operating hours ({operatingHours.displayDays},{" "}
              {operatingHours.displayHours}). <strong>Your slot is securely locked</strong> and
              will be reviewed and confirmed {operatingHours.nextOpenDayNotice} once our team verifies
              your receipt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200 text-left dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4 space-y-1.5">
            <h4 className="font-semibold text-green-900 dark:text-green-300 text-sm">
              ✅ Slot Successfully Reserved!
            </h4>
            <p className="text-green-800 dark:text-green-200 text-sm leading-relaxed">
              Please attach your payment receipt screenshot in the WhatsApp chat. Our team will verify your payment and confirm your appointment shortly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp CTA */}
      <a
        href={confirmation.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button
          size="lg"
          className="w-full h-14 text-base bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2 shadow-lg"
        >
          <MessageCircle className="h-5 w-5" />
          Open WhatsApp to Send Receipt
        </Button>
      </a>

      {/* Self-check status link */}
      <div className="pt-1">
        <Link
          href={`/check-booking?ref=${confirmation.referenceCode}`}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <Search className="h-3.5 w-3.5" />
          Track your booking status online anytime
        </Link>
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Book another appointment
      </button>
    </div>
  );
}
