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
import { useCustomerLanguage } from "./CustomerLanguageContext";

export function StepCustomerForm() {
  const {
    selectedService,
    selectedSlotStart,
    customerDetails,
    updateCustomerDetails,
    setPendingHold,
    nextStep,
    prevStep,
    currencySymbol,
  } = useBookingStore();
  const { language, t } = useCustomerLanguage();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [holdError, setHoldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!customerDetails.name.trim()) {
      newErrors.name = language === "zh" ? "请输入您的姓名或称呼" : "Name is required.";
    }
    const cleanPhone = customerDetails.phoneNumber.replace(/[\s-]/g, "");
    if (!cleanPhone) {
      newErrors.phoneNumber = language === "zh" ? "请输入 WhatsApp 手机号码" : "WhatsApp number is required.";
    } else if (cleanPhone.length < 8) {
      newErrors.phoneNumber = language === "zh" ? "请输入有效的手机号码" : "Enter a valid phone number.";
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
        phoneNumber: customerDetails.phoneNumber.replace(/[\s-]/g, ""),
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
          <span className="text-sm font-medium uppercase tracking-wider">
            {language === "zh" ? "第 3 步 / 共 4 步" : "Step 3 of 4"}
          </span>
        </div>
        <h2 className="text-2xl font-bold">{t.step3.title[language]}</h2>
        <p className="text-muted-foreground">{t.step3.subtitle[language]}</p>
      </div>

      {/* Booking Summary */}
      {selectedService && selectedSlotStart && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-semibold text-primary">{t.step3.summary[language]}</h4>
            <Separator className="bg-primary/20" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.service[language]}</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.duration[language]}</span>
                <span className="font-medium">
                  {selectedService.durationMinutes} {t.step1.minUnit[language]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.datetime[language]}</span>
                <span className="font-medium text-right">
                  {format(new Date(selectedSlotStart), "d MMM yyyy, h:mm a")}
                </span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="flex justify-between font-bold text-base">
                <span>{t.step3.total[language]}</span>
                <span className="text-primary font-black tabular-nums">
                  {formatPrice(selectedService.priceCents, currencySymbol)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t.step3.fullName[language]}</Label>
          <Input
            id="name"
            placeholder={t.step3.fullNamePlaceholder[language]}
            value={customerDetails.name}
            onChange={(e) => updateCustomerDetails({ name: e.target.value })}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t.step3.phone[language]}</Label>
          <Input
            id="phone"
            type="tel"
            placeholder={t.step3.phonePlaceholder[language]}
            value={customerDetails.phoneNumber}
            onChange={(e) => updateCustomerDetails({ phoneNumber: e.target.value })}
            className={errors.phoneNumber ? "border-destructive" : ""}
          />
          {errors.phoneNumber ? (
            <p className="text-xs text-destructive">{errors.phoneNumber}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t.step3.phoneNotice[language]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t.step3.notes[language]}</Label>
          <Textarea
            id="notes"
            placeholder={t.step3.notesPlaceholder[language]}
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

      {/* Floating Navigation Bar (like Desk Count Sales) */}
      <div className="fixed bottom-3 inset-x-0 z-30 max-w-md mx-auto px-4 pointer-events-none">
        <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg flex gap-3 pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isPending}
            className="flex-1 h-12 text-sm sm:text-base font-bold rounded-xl cursor-pointer border-border/80 bg-card hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t.step3.back[language]}
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="flex-1 h-12 text-sm sm:text-base font-bold rounded-xl shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.step3.holding[language]}
              </>
            ) : (
              <>
                {t.step3.holdSlotAndPay[language]}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
