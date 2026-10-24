"use client";

import { useEffect } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import { StepServiceSelect } from "./StepServiceSelect";
import { StepDateTimePicker } from "./StepDateTimePicker";
import { StepCustomerForm } from "./StepCustomerForm";
import { StepPaymentInstructions } from "./StepPaymentInstructions";
import { BookingConfirmation } from "./BookingConfirmation";
import { Flame } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ServiceDto } from "@/types";
import type { RushModeStatus } from "@/actions/emergency";

interface BookingFunnelProps {
  services: ServiceDto[];
  currencySymbol?: string;
  rushStatus?: RushModeStatus | null;
}

export function BookingFunnel({
  services,
  currencySymbol = "RM",
  rushStatus,
}: BookingFunnelProps) {
  const { currentStep, confirmation, setCurrencySymbol } = useBookingStore();
  const { language, t } = useCustomerLanguage();

  // Keep currencySymbol in sync with server setting
  useEffect(() => {
    if (currencySymbol) {
      setCurrencySymbol(currencySymbol);
      try {
        localStorage.setItem("app_currency_symbol", currencySymbol);
      } catch {}
    }
  }, [currencySymbol, setCurrencySymbol]);

  const steps = [
    { label: t.steps.step1[language] },
    { label: t.steps.step2[language] },
    { label: t.steps.step3[language] },
    { label: t.steps.step4[language] },
  ];

  // If we have a confirmation, show the success screen (step 5)
  if (confirmation) {
    return (
      <div className="max-w-md mx-auto px-4 pb-16 pt-6">
        <BookingConfirmation />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-32 pt-6">
      {/* Rush Mode Active Alert */}
      {rushStatus?.isActive && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-xs flex items-start gap-3">
          <Flame className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-foreground">
              {language === "zh" ? "🔥 客满高峰期提示" : "🔥 Peak Rush Hour Notice"}
            </p>
            <p className="leading-relaxed">
              {language === "zh"
                ? `本店目前现场客满，线上预约已暂时暂停接单，预计将于 ${
                    rushStatus.expiresAt ? format(new Date(rushStatus.expiresAt), "HH:mm") : ""
                  } 重新开放。如有急需欢迎直接到店或 WhatsApp 咨询。`
                : `Our studio is currently at peak capacity for walk-in clients. Online bookings are temporarily paused until ${
                    rushStatus.expiresAt ? format(new Date(rushStatus.expiresAt), "h:mm a") : ""
                  }. Please contact us via WhatsApp for urgent appointments.`}
            </p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 select-none">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground scale-110 shadow-md"
                      : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium hidden sm:block",
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded transition-all",
                    isCompleted ? "bg-primary/30" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && <StepServiceSelect services={services} />}
        {currentStep === 2 && <StepDateTimePicker />}
        {currentStep === 3 && <StepCustomerForm />}
        {currentStep === 4 && <StepPaymentInstructions />}
      </div>
    </div>
  );
}
