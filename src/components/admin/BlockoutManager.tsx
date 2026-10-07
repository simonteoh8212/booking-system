"use client";

import { useState, useTransition } from "react";
import { createTimeBlockout, deleteTimeBlockout } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Ban } from "lucide-react";
import { format } from "date-fns";
import type { TimeBlockoutDto } from "@/types";

interface BlockoutManagerProps {
  initialBlockouts: TimeBlockoutDto[];
}

export function BlockoutManager({ initialBlockouts }: BlockoutManagerProps) {
  const [blockouts, setBlockouts] = useState<TimeBlockoutDto[]>(initialBlockouts);
  const [form, setForm] = useState({ start: "", end: "", reason: "" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!form.start || !form.end) { setError("Start and end date/time are required."); return; }
    if (new Date(form.start) >= new Date(form.end)) { setError("End must be after start."); return; }
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
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTimeBlockout(id);
      if (result.success) setBlockouts((prev) => prev.filter((b) => b.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          Add Time Blockout
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="block-start">Start *</Label>
            <Input
              id="block-start"
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-end">End *</Label>
            <Input
              id="block-end"
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-reason">Reason (optional)</Label>
          <Input
            id="block-reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g. Public holiday, Lunch break…"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleAdd} disabled={isPending} size="sm" className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Blockout
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {blockouts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No blockouts configured. Add one above to block off time.
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
