"use client";

import { useState, useTransition } from "react";
import { getBookings } from "@/actions/admin-bookings";
import { AgendaCard } from "./AgendaCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { BookingDto } from "@/types";
import { cn } from "@/lib/utils";

interface AgendaViewProps {
  initialDate: string; // ISO
  initialBookings: BookingDto[];
}

export function AgendaView({ initialDate, initialBookings }: AgendaViewProps) {
  const [date, setDate] = useState(new Date(initialDate));
  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [isPending, startTransition] = useTransition();

  function loadBookings(newDate: Date) {
    startTransition(async () => {
      const result = await getBookings(
        startOfDay(newDate).toISOString(),
        endOfDay(newDate).toISOString()
      );
      if (result.success) setBookings(result.data);
    });
  }

  function changeDate(newDate: Date) {
    setDate(newDate);
    loadBookings(newDate);
  }

  function handleUpdate(updated: BookingDto) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
  }

  const active = bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW");
  const inactive = bookings.filter((b) => b.status === "CANCELLED" || b.status === "NO_SHOW");

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => changeDate(subDays(date, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="flex-1 sm:flex-none sm:w-52 justify-start gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(date, "EEEE, d MMMM yyyy")}</span>
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && changeDate(d)}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => changeDate(addDays(date, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => changeDate(new Date())}
          className="hidden sm:inline-flex"
        >
          Today
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: bookings.length, color: "text-foreground" },
          { label: "Active", value: active.length, color: "text-primary" },
          { label: "Cancelled", value: inactive.length, color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-3 text-center">
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bookings list */}
      {isPending ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading appointments…</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No appointments this day</p>
          <p className="text-sm">Navigate to a different date to view bookings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((booking) => (
            <AgendaCard key={booking.id} booking={booking} onUpdate={handleUpdate} />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium pt-2 px-1">
                Cancelled / No-show
              </p>
              {inactive.map((booking) => (
                <div key={booking.id} className="opacity-50">
                  <AgendaCard booking={booking} onUpdate={handleUpdate} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
