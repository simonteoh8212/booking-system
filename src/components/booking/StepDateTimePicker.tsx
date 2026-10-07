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
import type { TimeSlot } from "@/types";

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

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    let ignore = false;

    startTransition(async () => {
      const result = await getAvailableSlots(
        selectedDate.toISOString(),
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
          <span className="text-sm font-medium uppercase tracking-wider">Step 2 of 4</span>
        </div>
        <h2 className="text-2xl font-bold">Pick a Date & Time</h2>
        <p className="text-muted-foreground">
          Showing slots for: <strong>{selectedService?.name}</strong>
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
              Available times for {format(selectedDate, "EEEE, d MMMM")}
            </h3>
          </div>

          {isPending ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading available slots…</span>
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive text-center py-4">{loadError}</p>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No available slots on this day. Please try another date.
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

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canContinue}
          className="flex-1"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
