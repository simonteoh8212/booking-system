"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createService, updateService, deleteService } from "@/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Loader2, Pencil, Trash2, Plus, Clock, Package, Scissors } from "lucide-react";
import type { ServiceDto } from "@/types";

interface ServiceManagerProps {
  initialServices: ServiceDto[];
  currencySymbol?: string;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  type: "SERVICE" as "SERVICE" | "PRODUCT",
  durationMinutes: 60,
  priceCents: 0,
  isActive: true,
};

export function ServiceManager({
  initialServices,
  currencySymbol = "RM",
}: ServiceManagerProps) {
  const [services, setServices] = useState<ServiceDto[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceDto | null>(null);
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
      type: (service.type === "PRODUCT" ? "PRODUCT" : "SERVICE") as "SERVICE" | "PRODUCT",
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
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.type === "SERVICE" && form.durationMinutes < 1) { setError("Duration must be at least 1 minute."); return; }
    if (form.priceCents < 0) { setError("Price cannot be negative."); return; }

    const payload = {
      ...form,
      durationMinutes: form.type === "PRODUCT" ? (form.durationMinutes || 5) : form.durationMinutes,
    };

    startTransition(async () => {
      if (editTarget) {
        const result = await updateService(editTarget.id, payload);
        if (result.success) {
          setServices((prev) => prev.map((s) => (s.id === editTarget.id ? result.data : s)));
          setDialogOpen(false);
          toast.success("Service updated successfully!");
        } else {
          setError(result.error);
        }
      } else {
        const result = await createService(payload);
        if (result.success) {
          setServices((prev) => [...prev, result.data]);
          setDialogOpen(false);
          toast.success("Item created successfully!");
        } else {
          setError(result.error);
        }
      }
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteService(deleteTarget.id);
      if (result.success) {
        setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success("Service deleted successfully.");
      } else {
        toast.error(result.error || "Failed to delete service.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditTarget(null);
            setForm({ ...EMPTY_FORM, type: "PRODUCT", category: "Product", durationMinutes: 5 });
            setPriceInput("0.00");
            setError(null);
            setDialogOpen(true);
          }}
          className="gap-1.5 rounded-lg cursor-pointer"
        >
          <Package className="h-3.5 w-3.5" />
          Add Product
        </Button>
        <Button size="sm" onClick={openCreate} className="gap-1.5 rounded-lg cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Add Service
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {services.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            No catalog items yet
          </p>
        )}
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{service.name}</p>
                {service.type === "PRODUCT" ? (
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    Product
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] font-medium">
                    Service
                  </Badge>
                )}
                {service.category && (
                  <span className="text-xs text-muted-foreground">{service.category}</span>
                )}
                {!service.isActive && (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground tabular-nums">
                {service.type !== "PRODUCT" && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {service.durationMinutes} min
                  </span>
                )}
                <span className="font-mono font-semibold text-foreground">
                  {formatPrice(service.priceCents, currencySymbol)}
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
                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={() => setDeleteTarget(service)}
                title="Delete service"
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
            <DialogTitle>
              {editTarget
                ? `Edit ${form.type === "PRODUCT" ? "Product" : "Service"}`
                : `New ${form.type === "PRODUCT" ? "Product / 零售商品" : "Service / 服务项目"}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "SERVICE", durationMinutes: form.durationMinutes || 30 })}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  form.type === "SERVICE"
                    ? "border-2 border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Service / 服务项目</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "PRODUCT", category: form.category || "Product", durationMinutes: 5 })}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  form.type === "PRODUCT"
                    ? "border-2 border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Product / 零售商品</span>
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-name">Name *</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.type === "PRODUCT" ? "e.g. Argan Hair Oil / 洗发水" : "e.g. Hair Cut / 剪发"}
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
            <div className={`grid ${form.type === "PRODUCT" ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
              <div className="space-y-2">
                <Label htmlFor="svc-cat">Category</Label>
                <Input
                  id="svc-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={form.type === "PRODUCT" ? "e.g. Hair Care / Retail" : "e.g. Hair"}
                />
              </div>
              {form.type !== "PRODUCT" && (
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
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Price ({currencySymbol}) *</Label>
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

      {/* Delete Confirmation Dialog (Replaces native browser alert) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Delete Service</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to permanently delete this service? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">{deleteTarget.name}</p>
                {deleteTarget.category && (
                  <Badge variant="secondary" className="text-[10px]">{deleteTarget.category}</Badge>
                )}
              </div>
              {deleteTarget.description && (
                <p className="text-muted-foreground line-clamp-2">{deleteTarget.description}</p>
              )}
              <div className="flex items-center gap-3 text-muted-foreground font-medium pt-1">
                <span>⏱ {deleteTarget.durationMinutes} min</span>
                <span>💰 {formatPrice(deleteTarget.priceCents, currencySymbol)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmDelete}
              className="text-xs gap-1.5 font-bold"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Delete Service</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
