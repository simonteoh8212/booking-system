"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { StepServiceSelect } from "./StepServiceSelect";
import { StepDateTimePicker } from "./StepDateTimePicker";
import { StepCustomerForm } from "./StepCustomerForm";
import { StepPaymentInstructions } from "./StepPaymentInstructions";
import { BookingConfirmation } from "./BookingConfirmation";
import { cn } from "@/lib/utils";
import type { ServiceDto } from "@/types";

const STEPS = [
  { label: "Service" },
  { label: "Date & Time" },
  { label: "Details" },
  { label: "Payment" },
];

interface BookingFunnelProps {
  services: ServiceDto[];
}

export function BookingFunnel({ services }: BookingFunnelProps) {
  const { currentStep, confirmation } = useBookingStore();

  // If we have a confirmation, show the success screen (step 5)
  if (confirmation) {
    return (
      <div className="max-w-md mx-auto px-4 pb-16 pt-6">
        <BookingConfirmation />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step.label} className="flex items-center">
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
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
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
