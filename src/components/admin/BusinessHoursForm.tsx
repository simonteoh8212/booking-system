"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertBusinessSchedule } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import type { BusinessScheduleDto } from "@/types";
import { cn } from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";
import { FloatingSaveBtn } from "@/components/admin/FloatingSaveBtn";

const DAY_LABELS = [
  { zh: "星期日", en: "Sunday" },
  { zh: "星期一", en: "Monday" },
  { zh: "星期二", en: "Tuesday" },
  { zh: "星期三", en: "Wednesday" },
  { zh: "星期四", en: "Thursday" },
  { zh: "星期五", en: "Friday" },
  { zh: "星期六", en: "Saturday" },
];

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
  const { langMode } = useDeskLanguage();
  const [savedRows, setSavedRows] = useState<ScheduleRow[]>(() => buildRows(initialSchedules));
  const [rows, setRows] = useState<ScheduleRow[]>(() => buildRows(initialSchedules));
  const [isPending, startTransition] = useTransition();
  const [savedIdx, setSavedIdx] = useState<number | null>(null);

  useEffect(() => {
    const fresh = buildRows(initialSchedules);
    setSavedRows(fresh);
    setRows(fresh);
  }, [initialSchedules]);

  const hasChanges = rows.some((row, i) => {
    const orig = savedRows[i];
    return (
      orig &&
      (row.openTime !== orig.openTime ||
        row.closeTime !== orig.closeTime ||
        row.isClosed !== orig.isClosed)
    );
  });

  function handleDiscard() {
    setRows(savedRows.map((r) => ({ ...r })));
  }

  function updateRow(dayOfWeek: number, updates: Partial<ScheduleRow>) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...updates } : r))
    );
  }

  function handleSaveAll() {
    startTransition(async () => {
      const changedRows = rows.filter((row, i) => {
        const orig = savedRows[i];
        return (
          orig &&
          (row.openTime !== orig.openTime ||
            row.closeTime !== orig.closeTime ||
            row.isClosed !== orig.isClosed)
        );
      });

      if (changedRows.length === 0) return;

      const results = await Promise.all(
        changedRows.map((r) =>
          upsertBusinessSchedule(r.dayOfWeek, {
            openTime: r.openTime,
            closeTime: r.closeTime,
            isClosed: r.isClosed,
          })
        )
      );

      const allOk = results.every((r) => r.success);
      if (allOk) {
        setSavedRows(rows.map((r) => ({ ...r })));
        toast.success(
          resolveLabel(
            { zh: "所有营业时间已更新！", en: "Business hours updated!" },
            langMode
          )
        );
      } else {
        toast.error("Failed to update some business hours.");
      }
    });
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
        setSavedRows((prev) =>
          prev.map((r) => (r.dayOfWeek === row.dayOfWeek ? { ...row } : r))
        );
        const dayName = resolveLabel(DAY_LABELS[row.dayOfWeek], langMode);
        toast.success(
          resolveLabel(
            { zh: `${dayName} 营业时间已保存！`, en: `${dayName} business hours saved!` },
            langMode
          )
        );
        setTimeout(() => setSavedIdx(null), 2000);
      } else {
        toast.error(result.error || "Failed to save business hours.");
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
              {resolveLabel(DAY_LABELS[row.dayOfWeek], langMode)}
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
            <span className="text-muted-foreground text-sm">
              {resolveLabel({ zh: "至", en: "to" }, langMode)}
            </span>
            <Input
              type="time"
              value={row.closeTime}
              disabled={row.isClosed}
              onChange={(e) => updateRow(row.dayOfWeek, { closeTime: e.target.value })}
              className="w-32"
            />
            {row.isClosed && (
              <span className="text-xs text-muted-foreground font-medium">
                {resolveLabel({ zh: "休息（不营业）", en: "Closed" }, langMode)}
              </span>
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
              resolveLabel({ zh: "✓ 已保存", en: "✓ Saved" }, langMode)
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1" />
                {resolveLabel({ zh: "保存", en: "Save" }, langMode)}
              </>
            )}
          </Button>
        </div>
      ))}

      {/* Floating Save Changes Dock */}
      <FloatingSaveBtn
        show={hasChanges}
        onSave={handleSaveAll}
        onDiscard={handleDiscard}
        isPending={isPending}
        langMode={langMode}
      />
    </div>
  );
}
