"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { createBookingHold } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, User, Loader2, AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";

export function StepCustomerForm() {
  const {
    selectedService,
    selectedSlotStart,
    customerDetails,
    updateCustomerDetails,
    setPendingHold,
    nextStep,
    prevStep,
  } = useBookingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [holdError, setHoldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!customerDetails.name.trim()) newErrors.name = "Name is required.";
    if (!customerDetails.phoneNumber.trim()) {
      newErrors.phoneNumber = "WhatsApp number is required.";
    } else if (!/^(\+?60|0)[1-9]\d{7,9}$/.test(customerDetails.phoneNumber.replace(/\s/g, ""))) {
      newErrors.phoneNumber = "Enter a valid Malaysian phone number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (!validate() || !selectedService || !selectedSlotStart) return;

    setHoldError(null);
    startTransition(async () => {
      const result = await createBookingHold({
        serviceId: selectedService.id,
        startDatetimeIso: selectedSlotStart,
        customerName: customerDetails.name,
        phoneNumber: customerDetails.phoneNumber.replace(/\s/g, ""),
        notes: customerDetails.notes || undefined,
      });

      if (result.success) {
        setPendingHold(result.data);
        nextStep();
      } else {
        setHoldError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <User className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Step 3 of 4</span>
        </div>
        <h2 className="text-2xl font-bold">Your Details</h2>
        <p className="text-muted-foreground">We&apos;ll use this to confirm your appointment</p>
      </div>

      {/* Booking Summary */}
      {selectedService && selectedSlotStart && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-semibold text-primary">Booking Summary</h4>
            <Separator className="bg-primary/20" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{selectedService.durationMinutes} min</span>
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

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="Your full name"
            value={customerDetails.name}
            onChange={(e) => updateCustomerDetails({ name: e.target.value })}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="e.g. 0123456789"
            value={customerDetails.phoneNumber}
            onChange={(e) => updateCustomerDetails({ phoneNumber: e.target.value })}
            className={errors.phoneNumber ? "border-destructive" : ""}
          />
          {errors.phoneNumber ? (
            <p className="text-xs text-destructive">{errors.phoneNumber}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              We&apos;ll send the confirmation via WhatsApp.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests or notes for the therapist…"
            value={customerDetails.notes}
            onChange={(e) => updateCustomerDetails({ notes: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      {/* Error alert */}
      {holdError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{holdError}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep} disabled={isPending} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending} className="flex-1">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Holding slot…
            </>
          ) : (
            <>
              Hold Slot & Pay
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
