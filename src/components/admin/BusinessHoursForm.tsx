"use client";

import { useState, useTransition } from "react";
import { upsertBusinessSchedule } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import type { BusinessScheduleDto } from "@/types";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface BusinessHoursFormProps {
  initialSchedules: BusinessScheduleDto[];
}

type ScheduleRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

function buildRows(schedules: BusinessScheduleDto[]): ScheduleRow[] {
  return Array.from({ length: 7 }, (_, i) => {
    const existing = schedules.find((s) => s.dayOfWeek === i);
    return existing
      ? { dayOfWeek: i, openTime: existing.openTime, closeTime: existing.closeTime, isClosed: existing.isClosed }
      : { dayOfWeek: i, openTime: "09:00", closeTime: "18:00", isClosed: i === 0 };
  });
}

export function BusinessHoursForm({ initialSchedules }: BusinessHoursFormProps) {
  const [rows, setRows] = useState<ScheduleRow[]>(buildRows(initialSchedules));
  const [isPending, startTransition] = useTransition();
  const [savedIdx, setSavedIdx] = useState<number | null>(null);

  function updateRow(dayOfWeek: number, updates: Partial<ScheduleRow>) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...updates } : r))
    );
  }

  function handleSave(row: ScheduleRow) {
    startTransition(async () => {
      const result = await upsertBusinessSchedule(row.dayOfWeek, {
        openTime: row.openTime,
        closeTime: row.closeTime,
        isClosed: row.isClosed,
      });
      if (result.success) {
        setSavedIdx(row.dayOfWeek);
        setTimeout(() => setSavedIdx(null), 2000);
      }
    });
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.dayOfWeek}
          className={cn(
            "flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 rounded-xl border bg-card",
            row.isClosed && "opacity-60"
          )}
        >
          {/* Day toggle */}
          <div className="w-28 flex items-center gap-2 shrink-0">
            <input
              type="checkbox"
              id={`closed-${row.dayOfWeek}`}
              checked={!row.isClosed}
              onChange={(e) => updateRow(row.dayOfWeek, { isClosed: !e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor={`closed-${row.dayOfWeek}`} className="font-semibold text-sm cursor-pointer">
              {DAY_NAMES[row.dayOfWeek]}
            </Label>
          </div>

          {/* Time inputs */}
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="time"
              value={row.openTime}
              disabled={row.isClosed}
              onChange={(e) => updateRow(row.dayOfWeek, { openTime: e.target.value })}
              className="w-32"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="time"
              value={row.closeTime}
              disabled={row.isClosed}
              onChange={(e) => updateRow(row.dayOfWeek, { closeTime: e.target.value })}
              className="w-32"
            />
            {row.isClosed && (
              <span className="text-xs text-muted-foreground font-medium">Closed</span>
            )}
          </div>

          <Button
            size="sm"
            variant={savedIdx === row.dayOfWeek ? "secondary" : "outline"}
            onClick={() => handleSave(row)}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending && savedIdx === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedIdx === row.dayOfWeek ? (
              "✓ Saved"
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
