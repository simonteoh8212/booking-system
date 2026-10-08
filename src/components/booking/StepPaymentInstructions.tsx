"use client";

import { useEffect, useState, useTransition } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { confirmBookingReceipt } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice, cn } from "@/lib/utils";
import { format } from "date-fns";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  QrCode,
  AlertCircle,
  Clock,
  MessageCircle,
  RotateCcw,
  Moon,
} from "lucide-react";

const PAYMENT_QR_URL = process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? null;
const MERCHANT_WHATSAPP = process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP ?? "";

export function StepPaymentInstructions() {
  const {
    selectedService,
    selectedSlotStart,
    customerDetails,
    pendingHold,
    setConfirmation,
    setSubmitError,
    submitError,
    prevStep,
    goToStep,
  } = useBookingStore();

  const [isPending, startTransition] = useTransition();
  const operatingHours = getOperatingHoursInfo();

  // 7-minute countdown timer based on holdExpiresAt
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!pendingHold?.holdExpiresAt) return 7 * 60;
    const diff = Math.floor(
      (new Date(pendingHold.holdExpiresAt).getTime() - Date.now()) / 1000
    );
    return Math.max(diff, 0);
  });

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isExpired = secondsRemaining <= 0;

  function handleConfirmReceipt() {
    if (!pendingHold) return;

    startTransition(async () => {
      setSubmitError(null);
      const result = await confirmBookingReceipt(pendingHold.referenceCode);

      if (result.success) {
        setConfirmation(result.data);
        if (result.data.whatsappUrl) {
          window.open(result.data.whatsappUrl, "_blank");
        }
      } else {
        setSubmitError(result.error);
      }
    });
  }

  // Pre-filled fallback WhatsApp message for reschedule/refund if timer expired but money was sent
  const fallbackHelpUrl = `https://wa.me/${MERCHANT_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi, I made a payment of ${
      selectedService ? formatPrice(selectedService.priceCents) : ""
    } for ${selectedService?.name ?? "appointment"} (${
      selectedSlotStart ? format(new Date(selectedSlotStart), "d MMM yyyy, h:mm a") : ""
    }), Reference: ${pendingHold?.referenceCode ?? "N/A"}. My session timed out. Here is my payment receipt, please help me reschedule or refund.`
  )}`;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <CreditCard className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Step 4 of 4</span>
        </div>
        <h2 className="text-2xl font-bold">Payment & Confirmation</h2>
        <p className="text-muted-foreground">
          Transfer via QR code, then confirm via WhatsApp
        </p>
      </div>

      {/* Countdown Timer Banner */}
      <div
        className={cn(
          "p-4 rounded-xl border flex items-center justify-between transition-colors",
          isExpired
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {isExpired ? "Reservation Expired" : "Slot Temporarily Held"}
            </p>
            <p className="text-xs opacity-90">
              {isExpired
                ? "This slot has been released for others."
                : "Complete payment before timer reaches 00:00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xl font-bold tracking-wider">
            {isExpired ? "00:00" : timerDisplay}
          </span>
        </div>
      </div>

      {/* After-Hours Booking Notice (Configured via .env) */}
      {operatingHours.isOutside && (
        <div className="p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-left dark:bg-indigo-950/30 dark:border-indigo-800">
          <div className="flex items-start gap-2.5">
            <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                After-Hours Booking Notice
              </p>
              <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
                We are currently outside our operating hours ({operatingHours.displayDays},{" "}
                {operatingHours.displayHours}).
                <br />
                <strong>You can still proceed with payment!</strong> Once you click{" "}
                <em>&quot;I&apos;ve Paid — Send Receipt&quot;</em>, your slot is{" "}
                <strong>securely locked</strong> so no one else can take it. Our team will verify
                your receipt and confirm your booking {operatingHours.nextOpenDayNotice}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Summary */}
      {selectedService && selectedSlotStart && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-primary">Your Held Reservation</h4>
              {pendingHold && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {pendingHold.referenceCode}
                </span>
              )}
            </div>
            <Separator className="bg-primary/20" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{customerDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium text-right">
                  {format(new Date(selectedSlotStart), "d MMM yyyy, h:mm a")}
                </span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="flex justify-between font-bold text-base">
                <span>Total Due</span>
                <span className="text-primary">{formatPrice(selectedService.priceCents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Instructions */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">How to Pay</h3>
          </div>

          <ol className="space-y-3 text-sm text-muted-foreground list-none">
            {[
              "Scan the QR code below using DuitNow / Touch 'n Go eWallet or your banking app.",
              `Transfer the exact amount of ${selectedService ? formatPrice(selectedService.priceCents) : ""} to complete your booking.`,
              "📸 Take a screenshot of your successful payment receipt.",
              "Click 'I've Paid — Send Receipt via WhatsApp' below to lock your booking permanently.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* QR Code */}
          <div className="flex justify-center">
            {PAYMENT_QR_URL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={PAYMENT_QR_URL}
                alt="DuitNow / TnG QR Code"
                className="w-48 h-48 rounded-xl border object-contain shadow-sm"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
                <QrCode className="h-12 w-12 opacity-30" />
                <p className="text-xs text-center px-2">
                  Add your DuitNow / TnG QR code via{" "}
                  <code className="bg-muted px-1 rounded text-[10px]">
                    NEXT_PUBLIC_PAYMENT_QR_URL
                  </code>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expired Warning or Error */}
      {(isExpired || submitError) && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{submitError || "Your 7-minute reservation hold has expired."}</p>
            </div>
          </div>

          {/* Fallback Help Button */}
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2 border">
            <p className="text-muted-foreground">
              <strong>Already transferred money?</strong> Don&apos;t worry! Click below to send your receipt directly to our team via WhatsApp for priority rescheduling or instant refund:
            </p>
            <a
              href={fallbackHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Merchant for Help / Refund
            </a>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {isExpired ? (
          <Button
            variant="outline"
            onClick={() => goToStep(2)}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Pick Another Time Slot
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isPending}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleConfirmReceipt}
              disabled={isPending || isExpired}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  I&apos;ve Paid — Send Receipt
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
