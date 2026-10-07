"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MessageCircle, CalendarCheck, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

export function BookingConfirmation() {
  const { confirmation, reset } = useBookingStore();
  const [copied, setCopied] = useState(false);

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

      {/* What's next */}
      <Card className="bg-amber-50 border-amber-200 text-left">
        <CardContent className="p-4">
          <h4 className="font-semibold text-amber-800 text-sm mb-2">⏳ Next Step — Required!</h4>
          <p className="text-amber-700 text-sm leading-relaxed">
            Your slot is temporarily reserved. To <strong>confirm</strong> your booking,
            you must send your payment receipt screenshot via WhatsApp within{" "}
            <strong>30 minutes</strong>, or the slot will be released.
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp CTA */}
      <a
        href={confirmation.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button
          size="lg"
          className="w-full h-14 text-base bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
        >
          <MessageCircle className="h-5 w-5" />
          Send Receipt via WhatsApp
        </Button>
      </a>

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
