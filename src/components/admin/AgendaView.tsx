"use client";

import { useState, useTransition, useRef } from "react";
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
import { zhCN, enUS } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowUp,
} from "lucide-react";
import type { BookingDto, DeskLanguageMode } from "@/types";
import { cn, toBusinessDateString } from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";

interface AgendaViewProps {
  initialDate: string; // ISO
  initialBookings: BookingDto[];
  currencySymbol?: string;
  initialLanguage?: DeskLanguageMode;
}

export function AgendaView({
  initialDate,
  initialBookings,
  currencySymbol = "RM",
  initialLanguage = "ONLY_EN",
}: AgendaViewProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const locale = isZh ? zhCN : enUS;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate));
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date(initialDate))
  );
  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [isPending, startTransition] = useTransition();
  const detailsRef = useRef<HTMLDivElement>(null);

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

  // Navigation handlers (always step selected day; auto-switch month when crossing boundary)
  function stepDay(delta: -1 | 1) {
    const targetDay = delta === -1 ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    setSelectedDate(targetDay);
    if (!isSameMonth(targetDay, currentMonth)) {
      const targetMonth = startOfMonth(targetDay);
      setCurrentMonth(targetMonth);
      loadMonthBookings(targetMonth);
    }
  }

  function handlePrev() {
    stepDay(-1);
  }

  function handleNext() {
    stepDay(1);
  }

  function handlePrevMonth() {
    const prevMonth = subMonths(currentMonth, 1);
    setCurrentMonth(prevMonth);
    loadMonthBookings(prevMonth);
  }

  function handleNextMonth() {
    const nextMonth = addMonths(currentMonth, 1);
    setCurrentMonth(nextMonth);
    loadMonthBookings(nextMonth);
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

  function handleCalendarDayClick(day: Date) {
    setSelectedDate(day);
    if (!isSameMonth(day, currentMonth)) {
      const newMonth = startOfMonth(day);
      setCurrentMonth(newMonth);
      loadMonthBookings(newMonth);
    }
    // Smoothly scroll down to the appointments details section below the calendar
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

  const weekdays = isZh
    ? [
        { full: "周日", short: "日" },
        { full: "周一", short: "一" },
        { full: "周二", short: "二" },
        { full: "周三", short: "三" },
        { full: "周四", short: "四" },
        { full: "周五", short: "五" },
        { full: "周六", short: "六" },
      ]
    : [
        { full: "Sunday", short: "Sun" },
        { full: "Monday", short: "Mon" },
        { full: "Tuesday", short: "Tue" },
        { full: "Wednesday", short: "Wed" },
        { full: "Thursday", short: "Thu" },
        { full: "Friday", short: "Fri" },
        { full: "Saturday", short: "Sat" },
      ];

  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-base font-semibold text-foreground">
        {isZh ? "日程安排" : "Agenda"}
      </h2>
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
            title={isZh ? "前一天" : "Previous Day"}
            aria-label={isZh ? "前一天" : "Previous Day"}
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
                  <span>
                    {isZh
                      ? format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })
                      : format(selectedDate, "EEEE, d MMMM yyyy")}
                  </span>
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={locale}
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    handleDateSelect(d);
                    if (viewMode === "calendar") {
                      setTimeout(() => {
                        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-9 w-9 shrink-0"
            title={isZh ? "后一天" : "Next Day"}
            aria-label={isZh ? "后一天" : "Next Day"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleToday}
            className="h-9 text-xs font-semibold px-3"
          >
            {isZh ? "今天" : "Today"}
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
            {isZh ? "日程视图" : "Agenda View"}
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
            {isZh ? "月历视图" : "Calendar"}
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
                {isZh
                  ? format(currentMonth, "yyyy年 M月", { locale: zhCN })
                  : format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 shrink-0"
                  title={isZh ? "上个月" : "Previous Month"}
                  aria-label={isZh ? "上个月" : "Previous Month"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 shrink-0"
                  title={isZh ? "下个月" : "Next Month"}
                  aria-label={isZh ? "下个月" : "Next Month"}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground py-2.5">
              {weekdays.map((dayName) => (
                <div key={dayName.full} className="truncate px-1">
                  <span className="hidden sm:inline">{dayName.full}</span>
                  <span className="sm:hidden">{dayName.short}</span>
                </div>
              ))}
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

                // Day Label: "Oct 1" / "10月1日" on the 1st of month, otherwise "2", "3", etc.
                const dayLabel =
                  day.getDate() === 1
                    ? isZh
                      ? format(day, "M月d日")
                      : format(day, "MMM d")
                    : format(day, "d");

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleCalendarDayClick(day)}
                    title={
                      count > 0
                        ? isZh
                          ? `${count} 个预约 · 点击下方查看详情`
                          : `${count} appointment${count > 1 ? "s" : ""} · Click to view details below`
                        : isZh
                        ? format(day, "yyyy年M月d日")
                        : format(day, "d MMMM yyyy")
                    }
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
                          title={
                            isZh
                              ? `${count} 个预约`
                              : `${count} appointment${count > 1 ? "s" : ""}`
                          }
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
          <div ref={detailsRef} className="space-y-3 pt-1 scroll-mt-20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm">
                  {isZh
                    ? `${format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })} 预约`
                    : `Appointments for ${format(selectedDate, "EEEE, d MMMM yyyy")}`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                  {isZh
                    ? `${selectedDayBookings.length} 个预约`
                    : `${selectedDayBookings.length} ${
                        selectedDayBookings.length === 1 ? "booking" : "bookings"
                      }`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  title={isZh ? "回到日历顶部" : "Scroll back up to calendar"}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isZh ? "顶部" : "Top"}</span>
                </Button>
              </div>
            </div>

            {selectedDayBookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm font-medium">
                  {isZh ? "当天暂无预约。" : "No appointments on this date."}
                </p>
                <p className="text-xs opacity-80">
                  {isZh
                    ? "点击上方月历中的其他日期查看预约。"
                    : "Select another day on the calendar above to view bookings."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSelected.map((booking) => (
                  <AgendaCard
                    key={booking.id}
                    booking={booking}
                    currencySymbol={currencySymbol}
                    isZh={isZh}
                    onUpdate={handleUpdate}
                  />
                ))}
                {inactiveSelected.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium pt-2 px-1">
                      {isZh ? "已取消 / 爽约" : "Cancelled / No-show"}
                    </p>
                    {inactiveSelected.map((booking) => (
                      <div key={booking.id} className="opacity-50">
                        <AgendaCard
                          key={booking.id}
                          booking={booking}
                          currencySymbol={currencySymbol}
                          isZh={isZh}
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
                label: isZh ? "总计" : "Total",
                value: selectedDayBookings.length,
                color: "text-foreground",
              },
              {
                label: isZh ? "有效" : "Active",
                value: activeSelected.length,
                color: "text-primary",
              },
              {
                label: isZh ? "已取消" : "Cancelled",
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
              <p className="font-medium">
                {isZh ? "当天暂无预约" : "No appointments this day"}
              </p>
              <p className="text-sm">
                {isZh
                  ? "请切换其他日期或改用月历视图。"
                  : "Navigate to a different date or switch to Calendar view."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSelected.map((booking) => (
                <AgendaCard
                  key={booking.id}
                  booking={booking}
                  currencySymbol={currencySymbol}
                  isZh={isZh}
                  onUpdate={handleUpdate}
                />
              ))}
              {inactiveSelected.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium pt-2 px-1">
                    {isZh ? "已取消 / 爽约" : "Cancelled / No-show"}
                  </p>
                  {inactiveSelected.map((booking) => (
                    <div key={booking.id} className="opacity-50">
                      <AgendaCard
                        key={booking.id}
                        booking={booking}
                        currencySymbol={currencySymbol}
                        isZh={isZh}
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
    </div>
  );
}
