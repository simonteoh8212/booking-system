"use client";

import { useState, useTransition } from "react";
import { createService, updateService, deleteService } from "@/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Loader2, Pencil, Trash2, Plus, Clock, DollarSign } from "lucide-react";
import type { ServiceDto } from "@/types";

interface ServiceManagerProps {
  initialServices: ServiceDto[];
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  durationMinutes: 60,
  priceCents: 0,
  isActive: true,
};

export function ServiceManager({ initialServices }: ServiceManagerProps) {
  const [services, setServices] = useState<ServiceDto[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [priceInput, setPriceInput] = useState("0.00");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setPriceInput("0.00");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(service: ServiceDto) {
    setEditTarget(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      category: service.category ?? "",
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      isActive: service.isActive,
    });
    setPriceInput((service.priceCents / 100).toFixed(2));
    setError(null);
    setDialogOpen(true);
  }

  function handlePriceChange(val: string) {
    setPriceInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setForm((f) => ({ ...f, priceCents: Math.round(num * 100) }));
  }

  function handleSave() {
    if (!form.name.trim()) { setError("Service name is required."); return; }
    if (form.durationMinutes < 1) { setError("Duration must be at least 1 minute."); return; }
    if (form.priceCents < 0) { setError("Price cannot be negative."); return; }

    startTransition(async () => {
      if (editTarget) {
        const result = await updateService(editTarget.id, form);
        if (result.success) {
          setServices((prev) => prev.map((s) => (s.id === editTarget.id ? result.data : s)));
          setDialogOpen(false);
        } else {
          setError(result.error);
        }
      } else {
        const result = await createService(form);
        if (result.success) {
          setServices((prev) => [...prev, result.data]);
          setDialogOpen(false);
        } else {
          setError(result.error);
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteService(id);
      if (result.success) setServices((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      <div className="grid gap-3">
        {services.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No services yet. Add your first service.
          </p>
        )}
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center gap-4 p-4 rounded-xl border bg-card"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{service.name}</p>
                {service.category && (
                  <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                )}
                {!service.isActive && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                )}
              </div>
              {service.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {service.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {service.durationMinutes} min
                </span>
                <span className="flex items-center gap-1 font-medium text-primary">
                  <DollarSign className="h-3 w-3" />
                  {formatPrice(service.priceCents)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(service.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Name *</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Deep Tissue Massage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Brief description…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-cat">Category</Label>
                <Input
                  id="svc-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Massage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-dur">Duration (min) *</Label>
                <Input
                  id="svc-dur"
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Price (RM) *</Label>
              <Input
                id="svc-price"
                type="number"
                step="0.01"
                min={0}
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="svc-active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="svc-active">Active (visible to customers)</Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
