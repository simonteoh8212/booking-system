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
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addDays,
  subDays,
} from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import type { BookingDto } from "@/types";
import { cn, toBusinessDateString } from "@/lib/utils";

interface AgendaViewProps {
  initialDate: string; // ISO
  initialBookings: BookingDto[];
  currencySymbol?: string;
}

export function AgendaView({
  initialDate,
  initialBookings,
  currencySymbol = "RM",
}: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate));
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date(initialDate))
  );
  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [isPending, startTransition] = useTransition();

  // Load bookings for a given month window
  function loadMonthBookings(month: Date) {
    const rangeStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

    startTransition(async () => {
      const result = await getBookings(
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      );
      if (result.success) setBookings(result.data);
    });
  }

  // Navigation handlers
  function handlePrev() {
    if (viewMode === "calendar") {
      const prevMonth = subMonths(currentMonth, 1);
      setCurrentMonth(prevMonth);
      loadMonthBookings(prevMonth);
    } else {
      const prevDay = subDays(selectedDate, 1);
      setSelectedDate(prevDay);
      if (!isSameMonth(prevDay, currentMonth)) {
        setCurrentMonth(startOfMonth(prevDay));
        loadMonthBookings(prevDay);
      }
    }
  }

  function handleNext() {
    if (viewMode === "calendar") {
      const nextMonth = addMonths(currentMonth, 1);
      setCurrentMonth(nextMonth);
      loadMonthBookings(nextMonth);
    } else {
      const nextDay = addDays(selectedDate, 1);
      setSelectedDate(nextDay);
      if (!isSameMonth(nextDay, currentMonth)) {
        setCurrentMonth(startOfMonth(nextDay));
        loadMonthBookings(nextDay);
      }
    }
  }

  function handleToday() {
    const today = new Date();
    setSelectedDate(today);
    const thisMonth = startOfMonth(today);
    setCurrentMonth(thisMonth);
    loadMonthBookings(thisMonth);
  }

  function handleDateSelect(newDate: Date) {
    setSelectedDate(newDate);
    if (!isSameMonth(newDate, currentMonth)) {
      const newMonth = startOfMonth(newDate);
      setCurrentMonth(newMonth);
      loadMonthBookings(newMonth);
    }
  }

  function handleUpdate(updated: BookingDto) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
  }

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Filter bookings for the selected day
  const selectedDayKey = toBusinessDateString(selectedDate);
  const selectedDayBookings = bookings.filter(
    (b) => toBusinessDateString(b.startDatetime) === selectedDayKey
  );
  const activeSelected = selectedDayBookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW"
  );
  const inactiveSelected = selectedDayBookings.filter(
    (b) => b.status === "CANCELLED" || b.status === "NO_SHOW"
  );

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Date navigation & View mode switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Navigation Buttons & Date Picker */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="h-9 w-9 shrink-0"
            title={viewMode === "calendar" ? "Previous Month" : "Previous Day"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="h-9 min-w-[210px] sm:min-w-[240px] justify-start gap-2 text-xs font-semibold"
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{format(selectedDate, "EEEE, d MMMM yyyy")}</span>
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && handleDateSelect(d)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-9 w-9 shrink-0"
            title={viewMode === "calendar" ? "Next Month" : "Next Day"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleToday}
            className="h-9 text-xs font-semibold px-3"
          >
            Today
          </Button>
        </div>

        {/* Right: View Toggle (Agenda View vs Calendar) */}
        <div className="inline-flex rounded-xl border bg-muted/30 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("agenda")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
              viewMode === "agenda"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Agenda View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
              viewMode === "calendar"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Main Views Container with smooth transition */}
      <div className={cn("transition-opacity duration-200", isPending && "opacity-75")}>
        {/* ────────────────────────────────────────────────────────── */}
        {/* CALENDAR VIEW                                             */}
        {/* ────────────────────────────────────────────────────────── */}
        {viewMode === "calendar" && (
          <div className="space-y-6">
          {/* Calendar Card */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            {/* Calendar Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-card">
              <h2 className="text-xl font-bold tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground py-2.5">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                (dayName, i) => (
                  <div key={dayName} className="truncate px-1">
                    <span className="hidden sm:inline">{dayName}</span>
                    <span className="sm:hidden">{dayName.slice(0, 3)}</span>
                  </div>
                )
              )}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y border-b">
              {calendarDays.map((day) => {
                const dayKey = toBusinessDateString(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayCell = isToday(day);

                // Bookings on this day (exclude cancelled from badge count)
                const dayBookings = bookings.filter(
                  (b) =>
                    toBusinessDateString(b.startDatetime) === dayKey &&
                    b.status !== "CANCELLED"
                );
                const count = dayBookings.length;

                // Day Label: "Oct 1" on the 1st of month, otherwise "2", "3", etc.
                const dayLabel =
                  day.getDate() === 1 ? format(day, "MMM d") : format(day, "d");

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[75px] sm:min-h-[96px] p-2 flex flex-col justify-between cursor-pointer transition-all relative select-none",
                      !isCurrentMonth && "bg-muted/15 text-muted-foreground/45",
                      isCurrentMonth && "bg-card hover:bg-muted/30",
                      isSelected &&
                        "border-2 border-blue-500 z-10 bg-blue-50/40 dark:bg-blue-950/20"
                    )}
                  >
                    {/* Top Row: Day Number & Count Badge */}
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={cn(
                          "text-xs font-semibold leading-none",
                          !isCurrentMonth
                            ? "text-muted-foreground/40"
                            : isTodayCell
                            ? "text-blue-600 font-bold"
                            : "text-foreground"
                        )}
                      >
                        {dayLabel}
                      </span>

                      {/* Tiny Notification Badge */}
                      {count > 0 && (
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-muted text-muted-foreground font-semibold"
                          )}
                          title={`${count} appointment${count > 1 ? "s" : ""}`}
                        >
                          {count}
                        </span>
                      )}
                    </div>

                    {/* Today indicator dot if no badge */}
                    {isTodayCell && count === 0 && (
                      <div className="self-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Drawer below the Calendar */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm">
                  Appointments for {format(selectedDate, "EEEE, d MMMM yyyy")}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                {selectedDayBookings.length}{" "}
                {selectedDayBookings.length === 1 ? "booking" : "bookings"}
              </span>
            </div>

            {selectedDayBookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm font-medium">No appointments on this date.</p>
                <p className="text-xs opacity-80">
                  Select another day on the calendar above to view bookings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSelected.map((booking) => (
                  <AgendaCard
                    key={booking.id}
                    booking={booking}
                    currencySymbol={currencySymbol}
                    onUpdate={handleUpdate}
                  />
                ))}
                {inactiveSelected.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium pt-2 px-1">
                      Cancelled / No-show
                    </p>
                    {inactiveSelected.map((booking) => (
                      <div key={booking.id} className="opacity-50">
                        <AgendaCard
                          key={booking.id}
                          booking={booking}
                          currencySymbol={currencySymbol}
                          onUpdate={handleUpdate}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* AGENDA VIEW                                               */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "agenda" && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total",
                value: selectedDayBookings.length,
                color: "text-foreground",
              },
              {
                label: "Active",
                value: activeSelected.length,
                color: "text-primary",
              },
              {
                label: "Cancelled",
                value: inactiveSelected.length,
                color: "text-destructive",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-card p-3 text-center"
              >
                <p className={cn("text-2xl font-bold", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Bookings list */}
          {selectedDayBookings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No appointments this day</p>
              <p className="text-sm">
                Navigate to a different date or switch to Calendar view.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSelected.map((booking) => (
                <AgendaCard
                  key={booking.id}
                  booking={booking}
                  currencySymbol={currencySymbol}
                  onUpdate={handleUpdate}
                />
              ))}
              {inactiveSelected.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium pt-2 px-1">
                    Cancelled / No-show
                  </p>
                  {inactiveSelected.map((booking) => (
                    <div key={booking.id} className="opacity-50">
                      <AgendaCard
                        key={booking.id}
                        booking={booking}
                        currencySymbol={currencySymbol}
                        onUpdate={handleUpdate}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
