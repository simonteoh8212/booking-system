"use client";

import { useEffect, useState, useTransition } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { getAvailableSlots } from "@/actions/booking";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeSlot } from "@/types";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import { FloatingActionBtns } from "./FloatingActionBtns";

export function StepDateTimePicker() {
  const {
    selectedService,
    selectedDate,
    selectedSlotStart,
    selectDate,
    selectSlot,
    nextStep,
    prevStep,
  } = useBookingStore();
  const { language, t } = useCustomerLanguage();

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    let ignore = false;

    startTransition(async () => {
      const result = await getAvailableSlots(
        format(selectedDate, "yyyy-MM-dd"),
        selectedService.durationMinutes
      );
      if (ignore) return;
      if (result.success) {
        setLoadError(null);
        setSlots(result.data);
      } else {
        setLoadError(result.error);
        setSlots([]);
      }
    });

    return () => {
      ignore = true;
    };
  }, [selectedDate, selectedService]);

  const canContinue = !!selectedSlotStart;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">
            {language === "zh" ? "第 2 步 / 共 4 步" : "Step 2 of 4"}
          </span>
        </div>
        <h2 className="text-2xl font-bold">{t.step2.title[language]}</h2>
        <p className="text-muted-foreground">
          {language === "zh" ? "已选项目：" : "Showing slots for: "}
          <strong>{selectedService?.name}</strong>
        </p>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={(date) => date && selectDate(date)}
            disabled={(date) => date < addDays(new Date(), -1)}
            className="rounded-lg"
          />
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">
              {language === "zh"
                ? `${format(selectedDate, "M月d日 (EEEE)")} 可用时段`
                : `Available times for ${format(selectedDate, "EEEE, d MMMM")}`}
            </h3>
          </div>

          {isPending ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{language === "zh" ? "正在查询可用时段…" : "Loading available slots…"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive text-center py-4">{loadError}</p>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                {t.step2.noSlots[language]}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const slotDate = new Date(slot.startTime);
                const label = format(slotDate, "h:mm a");
                const isSelected = selectedSlotStart === slot.startTime;

                return (
                  <button
                    key={slot.startTime}
                    onClick={() => selectSlot(slot.startTime, slot.endTime)}
                    className={cn(
                      "rounded-lg border py-2.5 px-2 text-sm font-medium transition-all duration-150",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border hover:border-primary/60 hover:bg-primary/5"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Navigation Dock */}
      <FloatingActionBtns
        topContent={
          selectedSlotStart && (
            <div className="flex items-center justify-between text-xs px-1 text-muted-foreground font-medium">
              <span>{language === "zh" ? "已选时段" : "Selected slot"}</span>
              <span className="font-bold text-foreground">
                {format(new Date(selectedSlotStart), "h:mm a")}
              </span>
            </div>
          )
        }
        onBack={prevStep}
        backText={
          <>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t.step2.back[language]}
          </>
        }
        onAction={nextStep}
        actionDisabled={!canContinue}
        actionText={
          <>
            {t.step2.continue[language]}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </>
        }
      />
    </div>
  );
}
