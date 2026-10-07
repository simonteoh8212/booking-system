"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { createBooking } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { useTransition } from "react";

// Replace with your actual DuitNow/TnG QR code image path or URL
const PAYMENT_QR_URL = process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? null;

export function StepPaymentInstructions() {
  const {
    selectedService,
    selectedSlotStart,
    customerDetails,
    setConfirmation,
    setSubmitError,
    submitError,
    nextStep,
    prevStep,
  } = useBookingStore();

  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selectedService || !selectedSlotStart) return;

    startTransition(async () => {
      setSubmitError(null);
      const result = await createBooking({
        serviceId: selectedService.id,
        startDatetimeIso: selectedSlotStart,
        customerName: customerDetails.name,
        phoneNumber: customerDetails.phoneNumber.replace(/\s/g, ""),
        notes: customerDetails.notes || undefined,
      });

      if (result.success) {
        setConfirmation(result.data);
        nextStep();
      } else {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <CreditCard className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Step 4 of 4</span>
        </div>
        <h2 className="text-2xl font-bold">Payment Instructions</h2>
        <p className="text-muted-foreground">
          Complete your payment, then confirm via WhatsApp
        </p>
      </div>

      {/* Booking Summary */}
      {selectedService && selectedSlotStart && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-semibold text-primary">Your Booking</h4>
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
                <span>Total</span>
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
              "Scan the QR code below using DuitNow / Touch 'n Go eWallet or any banking app.",
              `Transfer the exact amount of ${selectedService ? formatPrice(selectedService.priceCents) : ""} to complete your booking.`,
              "📸 Take a screenshot of your payment receipt — you will need to attach it in the next step.",
              "Click the button below to lock your slot and send your receipt via WhatsApp.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* QR Code placeholder */}
          <div className="flex justify-center">
            {PAYMENT_QR_URL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={PAYMENT_QR_URL}
                alt="DuitNow / TnG QR Code"
                className="w-48 h-48 rounded-xl border object-contain"
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

      {/* Error message */}
      {submitError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep} disabled={isPending} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Locking slot…
            </>
          ) : (
            <>
              Confirm & Send via WhatsApp
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
