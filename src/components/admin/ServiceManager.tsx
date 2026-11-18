"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createService, updateService, deleteService } from "@/actions/services";
import { useDeskLanguage } from "@/lib/use-desk-language";
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
import { formatPrice } from "@/lib/utils";
import { Loader2, Pencil, Trash2, Plus, Clock, Package, Scissors, Search, X } from "lucide-react";
import type { DeskLanguageMode, ServiceDto } from "@/types";

interface ServiceManagerProps {
  initialServices: ServiceDto[];
  currencySymbol?: string;
  initialLanguage?: DeskLanguageMode;
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
  initialLanguage = "ONLY_EN",
}: ServiceManagerProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [services, setServices] = useState<ServiceDto[]>(initialServices);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SERVICE" | "PRODUCT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [priceInput, setPriceInput] = useState("0.00");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const serviceCount = services.filter((s) => s.type !== "PRODUCT").length;
  const productCount = services.filter((s) => s.type === "PRODUCT").length;

  const filteredServices = services.filter((s) => {
    const matchesType =
      typeFilter === "ALL" ||
      (typeFilter === "PRODUCT" ? s.type === "PRODUCT" : s.type !== "PRODUCT");
    if (!matchesType) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category ?? "").toLowerCase().includes(q)
    );
  });

  function openCreate(defaultType: "SERVICE" | "PRODUCT" = "SERVICE") {
    setEditTarget(null);
    setForm(
      defaultType === "PRODUCT"
        ? { ...EMPTY_FORM, type: "PRODUCT", category: "Product", durationMinutes: 5 }
        : EMPTY_FORM
    );
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
      type: service.type === "PRODUCT" ? "PRODUCT" : "SERVICE",
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
    if (!form.name.trim()) {
      setError(t("Name is required.", "请输入名称。"));
      return;
    }
    if (form.type === "SERVICE" && form.durationMinutes < 1) {
      setError(t("Duration must be at least 1 minute.", "时长至少为 1 分钟。"));
      return;
    }
    if (form.priceCents < 0) {
      setError(t("Price cannot be negative.", "价格不能为负数。"));
      return;
    }

    const payload = {
      ...form,
      durationMinutes: form.type === "PRODUCT" ? form.durationMinutes || 5 : form.durationMinutes,
    };

    startTransition(async () => {
      if (editTarget) {
        const result = await updateService(editTarget.id, payload);
        if (result.success) {
          setServices((prev) => prev.map((s) => (s.id === editTarget.id ? result.data : s)));
          setDialogOpen(false);
          toast.success(t("Item updated.", "已更新。"));
        } else {
          setError(result.error);
        }
      } else {
        const result = await createService(payload);
        if (result.success) {
          setServices((prev) => [...prev, result.data]);
          setDialogOpen(false);
          toast.success(t("Item created.", "已创建。"));
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
        toast.success(t("Item deleted.", "已删除。"));
      } else {
        toast.error(result.error || t("Failed to delete.", "删除失败。"));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
          {[
            { id: "ALL" as const, label: t("All", "全部"), count: services.length },
            { id: "SERVICE" as const, label: t("Services", "服务"), count: serviceCount },
            { id: "PRODUCT" as const, label: t("Products", "商品"), count: productCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                typeFilter === tab.id
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span suppressHydrationWarning>{tab.label}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openCreate("PRODUCT")}
            className="gap-1.5 rounded-lg cursor-pointer"
          >
            <Package className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{t("Add Product", "添加商品")}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => openCreate("SERVICE")}
            className="gap-1.5 rounded-lg cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{t("Add Service", "添加服务")}</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      {services.length > 0 && (
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search name or category…", "搜索名称或分类…")}
            className="pl-9 pr-9 h-9 rounded-lg text-base sm:text-sm bg-card"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label={t("Clear search", "清除搜索")}
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Catalog List */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12" suppressHydrationWarning>
            {services.length === 0
              ? t("No catalog items yet", "暂无服务或商品")
              : t("No matching items", "没有匹配的项目")}
          </div>
        ) : (
          filteredServices.map((service) => {
            const isProduct = service.type === "PRODUCT";
            return (
              <div
                key={service.id}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors ${
                  !service.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                    {isProduct ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Scissors className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {service.name}
                      </p>
                      {service.category && (
                        <span className="text-xs text-muted-foreground truncate">
                          {service.category}
                        </span>
                      )}
                      {!service.isActive && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {t("Hidden", "已下架")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="text-right tabular-nums">
                    <div className="text-sm font-semibold text-foreground">
                      {formatPrice(service.priceCents, currencySymbol)}
                    </div>
                    {!isProduct && (
                      <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{service.durationMinutes} min</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => openEdit(service)}
                      aria-label={t("Edit item", "编辑")}
                      title={t("Edit", "编辑")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => setDeleteTarget(service)}
                      aria-label={t("Delete item", "删除")}
                      title={t("Delete", "删除")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? form.type === "PRODUCT"
                  ? t("Edit Product", "编辑商品")
                  : t("Edit Service", "编辑服务")
                : form.type === "PRODUCT"
                  ? t("New Product", "添加商品")
                  : t("New Service", "添加服务")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, type: "SERVICE", durationMinutes: form.durationMinutes || 30 })
                }
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  form.type === "SERVICE"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>{t("Service", "服务项目")}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    type: "PRODUCT",
                    category: form.category || "Product",
                    durationMinutes: 5,
                  })
                }
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  form.type === "PRODUCT"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>{t("Product", "零售商品")}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-name">{t("Name", "名称")} *</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={
                  form.type === "PRODUCT"
                    ? t("e.g. Argan Hair Oil", "例如：摩洛哥护发精油")
                    : t("e.g. Hair Cut", "例如：剪发")
                }
                className="text-base sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">{t("Description", "描述")}</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder={t("Optional", "选填")}
                className="text-base sm:text-sm"
              />
            </div>

            <div className={`grid ${form.type === "PRODUCT" ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
              <div className="space-y-1.5">
                <Label htmlFor="svc-cat">{t("Category", "分类")}</Label>
                <Input
                  id="svc-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={form.type === "PRODUCT" ? t("e.g. Hair Care", "例如：护理品") : t("e.g. Hair", "例如：美发")}
                  className="text-base sm:text-sm"
                />
              </div>
              {form.type !== "PRODUCT" && (
                <div className="space-y-1.5">
                  <Label htmlFor="svc-dur">{t("Duration (min)", "时长 (分钟)")} *</Label>
                  <Input
                    id="svc-dur"
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })
                    }
                    className="text-base sm:text-sm tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-price">
                {t("Price", "价格")} ({currencySymbol}) *
              </Label>
              <Input
                id="svc-price"
                type="number"
                step="0.01"
                min={0}
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                className="text-base sm:text-sm tabular-nums"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <span>{t("Active", "上架显示")}</span>
            </label>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              {t("Cancel", "取消")}
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editTarget ? t("Save", "保存") : t("Create", "创建")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>{t("Delete Item", "删除项目")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "This permanently removes the item from your catalog.",
                "确认永久删除此项目？此操作无法撤销。"
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs space-y-1">
              <p className="font-semibold text-sm text-foreground">{deleteTarget.name}</p>
              <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
                {deleteTarget.type !== "PRODUCT" && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {deleteTarget.durationMinutes} min
                  </span>
                )}
                <span className="font-semibold text-foreground">
                  {formatPrice(deleteTarget.priceCents, currencySymbol)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              {t("Cancel", "取消")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmDelete}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("Delete", "删除")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
