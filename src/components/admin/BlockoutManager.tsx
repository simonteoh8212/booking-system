"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createTimeBlockout, deleteTimeBlockout } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Ban } from "lucide-react";
import { format } from "date-fns";
import type { TimeBlockoutDto } from "@/types";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";

interface BlockoutManagerProps {
  initialBlockouts: TimeBlockoutDto[];
}

export function BlockoutManager({ initialBlockouts }: BlockoutManagerProps) {
  const { langMode } = useDeskLanguage();
  const [blockouts, setBlockouts] = useState<TimeBlockoutDto[]>(initialBlockouts);
  const [form, setForm] = useState({ start: "", end: "", reason: "" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!form.start || !form.end) {
      setError(
        resolveLabel(
          { zh: "必须填写开始与结束日期时间。", en: "Start and end date/time are required." },
          langMode
        )
      );
      return;
    }
    if (new Date(form.start) >= new Date(form.end)) {
      setError(
        resolveLabel(
          { zh: "结束时间必须在开始时间之后。", en: "End must be after start." },
          langMode
        )
      );
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createTimeBlockout({
        startDatetimeIso: new Date(form.start).toISOString(),
        endDatetimeIso: new Date(form.end).toISOString(),
        reason: form.reason || undefined,
      });
      if (result.success) {
        setBlockouts((prev) => [...prev, result.data]);
        setForm({ start: "", end: "", reason: "" });
        toast.success(
          resolveLabel(
            { zh: "不可预约时段创建成功！", en: "Time blockout created successfully!" },
            langMode
          )
        );
      } else {
        setError(result.error);
        toast.error(result.error || "Failed to create blockout.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTimeBlockout(id);
      if (result.success) {
        setBlockouts((prev) => prev.filter((b) => b.id !== id));
        toast.success(
          resolveLabel({ zh: "不可预约时段已删除。", en: "Time blockout removed." }, langMode)
        );
      } else {
        toast.error(result.error || "Failed to remove blockout.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          {resolveLabel({ zh: "添加不可预约时段", en: "Add Time Blockout" }, langMode)}
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="block-start">
              {resolveLabel({ zh: "开始时间 *", en: "Start *" }, langMode)}
            </Label>
            <Input
              id="block-start"
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-end">
              {resolveLabel({ zh: "结束时间 *", en: "End *" }, langMode)}
            </Label>
            <Input
              id="block-end"
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-reason">
            {resolveLabel({ zh: "屏蔽原因（选填）", en: "Reason (optional)" }, langMode)}
          </Label>
          <Input
            id="block-reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder={resolveLabel(
              { zh: "例如：公共假期、员工聚餐、设备维护…", en: "e.g. Public holiday, Lunch break…" },
              langMode
            )}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleAdd} disabled={isPending} size="sm" className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {resolveLabel({ zh: "添加时段", en: "Add Blockout" }, langMode)}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {blockouts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {resolveLabel(
              { zh: "暂无屏蔽时段。可在上方添加以锁定不可预约的时间范围。", en: "No blockouts configured. Add one above to block off time." },
              langMode
            )}
          </p>
        )}
        {blockouts.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-destructive/5 border-destructive/20"
          >
            <Ban className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {format(new Date(b.startDatetime), "d MMM, h:mm a")}
                {" – "}
                {format(new Date(b.endDatetime), "d MMM yyyy, h:mm a")}
              </p>
              {b.reason && (
                <p className="text-xs text-muted-foreground">{b.reason}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(b.id)}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
