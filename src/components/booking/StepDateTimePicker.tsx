"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { getAvailableSlots } from "@/actions/booking";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarIcon, Clock, Loader2, Sun, Moon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeSlot } from "@/types";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import { CUSTOMER_I18N, getDateFnsLocale } from "@/lib/customer-i18n";
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
  const i18n = t?.step2?.stepIndicator ? t.step2 : CUSTOMER_I18N.step2;

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [sessionFilter, setSessionFilter] = useState<"all" | "day" | "night">("all");
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  const timeSlotsRef = useRef<HTMLDivElement>(null);

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    selectDate(date);
    setTimeout(() => {
      timeSlotsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

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

  // Counts for Day (< 18:00) vs Night (>= 18:00) sessions
  const daySlotsCount = slots.filter((s) => new Date(s.startTime).getHours() < 18).length;
  const nightSlotsCount = slots.filter((s) => new Date(s.startTime).getHours() >= 18).length;

  const displayedSlots = slots.filter((s) => {
    const hour = new Date(s.startTime).getHours();
    if (sessionFilter === "day") return hour < 18;
    if (sessionFilter === "night") return hour >= 18;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">
            {i18n.stepIndicator[language]}
          </span>
        </div>
        <h2 className="text-2xl font-bold">{i18n.title[language]}</h2>
        <p className="text-muted-foreground">
          {i18n.showingSlotsFor[language]}
          <strong>{selectedService?.name}</strong>
        </p>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden shadow-xs">
        <CardContent className="p-3 sm:p-5">
          <Calendar
            mode="single"
            locale={getDateFnsLocale(language)}
            selected={selectedDate ?? undefined}
            onSelect={handleDateSelect}
            disabled={(date) => date < addDays(new Date(), -1)}
            className="w-full p-0"
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full gap-3 sm:gap-4",
              month_grid: "w-full border-collapse",
              weekdays: "flex w-full mb-1",
              weekday: "flex-1 text-center font-bold text-muted-foreground text-xs sm:text-sm py-1.5",
              week: "flex w-full mt-1.5 justify-between gap-1",
              day: "flex-1 aspect-square h-auto p-0 text-center font-medium",
              month_caption: "flex h-9 sm:h-10 w-full items-center justify-center px-9 sm:px-10 mb-2 font-bold text-sm sm:text-base",
              caption_label: "text-sm sm:text-base font-bold select-none",
              button_previous: "h-8 w-8 sm:h-9 sm:w-9 p-0 select-none aria-disabled:opacity-50 cursor-pointer rounded-xl hover:bg-muted",
              button_next: "h-8 w-8 sm:h-9 sm:w-9 p-0 select-none aria-disabled:opacity-50 cursor-pointer rounded-xl hover:bg-muted",
            }}
          />
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <div ref={timeSlotsRef} className="space-y-3 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">
              {i18n.availableTimesForDate(
                format(selectedDate, i18n.dateFormat[language], {
                  locale: getDateFnsLocale(language),
                })
              )[language]}
            </h3>
          </div>

          {/* Quick Day / Night Session Filter Tabs */}
          {slots.length > 0 && !isPending && daySlotsCount > 0 && nightSlotsCount > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 text-xs w-fit">
              <button
                type="button"
                onClick={() => setSessionFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  sessionFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {i18n.allSessions[language]} ({slots.length})
              </button>

              <button
                type="button"
                onClick={() => setSessionFilter("day")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer",
                  sessionFilter === "day"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                <span>{i18n.daySession[language]}</span>
                <span className="opacity-75">({daySlotsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSessionFilter("night")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer",
                  sessionFilter === "night"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Moon className="h-3 w-3 text-indigo-500 fill-indigo-500/20" />
                <span>{i18n.nightSession[language]}</span>
                <span className="opacity-75">({nightSlotsCount})</span>
              </button>
            </div>
          )}

          {isPending ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{i18n.loadingSlots[language]}</span>
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
                {i18n.noSlots[language]}
              </p>
            </div>
          ) : displayedSlots.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl">
              <p className="text-muted-foreground text-xs">
                {i18n.noFilteredSlots[language]}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {displayedSlots.map((slot) => {
                const slotDate = new Date(slot.startTime);
                const label = format(slotDate, "h:mm a");
                const isSelected = selectedSlotStart === slot.startTime;
                const isNight = slotDate.getHours() >= 18;

                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => selectSlot(slot.startTime, slot.endTime)}
                    className={cn(
                      "rounded-xl border py-2.5 px-1.5 sm:px-2 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                        : isNight
                          ? "border-border/80 bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 text-foreground"
                          : "border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 text-foreground"
                    )}
                    title={
                      isNight
                        ? i18n.nightSessionTooltip[language]
                        : i18n.daySessionTooltip[language]
                    }
                  >
                    {isNight ? (
                      <Moon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isSelected
                            ? "text-primary-foreground fill-current"
                            : "text-indigo-500 dark:text-indigo-400 fill-indigo-500/20"
                        )}
                      />
                    ) : (
                      <Sun
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isSelected
                            ? "text-primary-foreground fill-current"
                            : "text-amber-500 dark:text-amber-400 fill-amber-500/20"
                        )}
                      />
                    )}
                    <span>{label}</span>
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
              <span>{i18n.selectedSlot[language]}</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                {new Date(selectedSlotStart).getHours() >= 18 ? (
                  <Moon className="h-3 w-3 text-indigo-500 fill-indigo-500/20" />
                ) : (
                  <Sun className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                )}
                <span>{format(new Date(selectedSlotStart), "h:mm a")}</span>
              </span>
            </div>
          )
        }
        onBack={prevStep}
        backText={
          <>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {i18n.back[language]}
          </>
        }
        onAction={nextStep}
        actionDisabled={!canContinue}
        actionText={
          <>
            {i18n.continue[language]}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </>
        }
      />
    </div>
  );
}
