"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { recordDeskSale, type DeskAppointmentItem } from "@/actions/desk";
import { lookupMembersForCheckout } from "@/actions/members";
import { formatPrice, generateIdempotencyKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ServiceDto, DeskLanguageMode, MemberDto } from "@/types";
import { resolveServiceName } from "@/lib/desk-i18n";
import {
  ArrowLeft,
  CalendarCheck,
  UserPlus,
  Check,
  Loader2,
  AlertCircle,
  Receipt,
  Search,
  Wallet,
  Ticket,
  X,
  Banknote,
  QrCode,
  CreditCard,
} from "lucide-react";

export interface DeskSaleSuccessData {
  serviceIds: string[];
  serviceNames: string[];
  totalCents: number;
  referenceCode?: string;
  creditUsedCents?: number;
  remainingCreditCents?: number;
  customerName?: string;
  customerPhone?: string;
}

interface DeskCountSalesViewProps {
  services: ServiceDto[];
  todayAppointments: DeskAppointmentItem[];
  initialAppointmentId?: string;
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
  showWalkIn?: boolean;
  showBookedCheckout?: boolean;
  onBack: () => void;
  onSuccess: (data?: DeskSaleSuccessData) => void;
}

export function DeskCountSalesView({
  services,
  todayAppointments,
  initialAppointmentId = "",
  currencySymbol = "RM",
  languageMode = "ONLY_EN",
  showWalkIn = true,
  showBookedCheckout = true,
  onBack,
  onSuccess,
}: DeskCountSalesViewProps) {
  const isZh = languageMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const fallbackShowBoth = !showWalkIn && !showBookedCheckout;
  const canShowWalkIn = fallbackShowBoth || showWalkIn;
  const canShowBooked = fallbackShowBoth || showBookedCheckout;

  const [sourceType, setSourceType] = useState<"APPOINTMENT" | "WALKIN">(() => {
    if (initialAppointmentId && canShowBooked) return "APPOINTMENT";
    if (!canShowWalkIn && canShowBooked) return "APPOINTMENT";
    return "WALKIN";
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(
    initialAppointmentId
  );
  const [showWalkinFields, setShowWalkinFields] = useState(false);
  const [walkinName, setWalkinName] = useState<string>("");
  const [walkinPhone, setWalkinPhone] = useState<string>("");

  const [catalogFilter, setCatalogFilter] = useState<"ALL" | "SERVICE" | "PRODUCT">("ALL");

  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");
  const [memberSearchResults, setMemberSearchResults] = useState<MemberDto[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [promoRedemptions, setPromoRedemptions] = useState<Record<string, string>>({});
  const [useMemberCredit, setUseMemberCredit] = useState<boolean>(true);

  const defaultHairCutId = (() => {
    const hairCut = services.find(
      (s) => s.name.includes("剪") || s.name.toLowerCase().includes("cut")
    );
    return hairCut ? hairCut.id : services[0]?.id;
  })();

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (initialAppointmentId) {
      const apt = todayAppointments.find((a) => a.id === initialAppointmentId);
      if (apt) {
        const matched = services.find((s) => s.name === apt.serviceName);
        if (matched) return [matched.id];
      }
    }
    return defaultHairCutId ? [defaultHairCutId] : [];
  });
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "DUITNOW_QR" | "CARD">("CASH");
  const [notes, setNotes] = useState<string>("");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const isSubmittingSaleRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const activeAppointment = todayAppointments.find(
    (a) => a.id === selectedAppointmentId
  );

  function computeAutoPromos(
    member: MemberDto | null,
    serviceIds: string[],
    prev: Record<string, string>
  ): Record<string, string> {
    if (!member || member.activePackages.length === 0) return {};
    const next: Record<string, string> = {};
    const usedCountByPkg: Record<string, number> = {};

    for (const sid of serviceIds) {
      const existingPkgId = prev[sid];
      if (existingPkgId) {
        const pkg = member.activePackages.find((p) => p.id === existingPkgId);
        const alreadyUsed = usedCountByPkg[existingPkgId] || 0;
        if (pkg && pkg.serviceIds.includes(sid) && pkg.remainingSessions > alreadyUsed) {
          next[sid] = existingPkgId;
          usedCountByPkg[existingPkgId] = alreadyUsed + 1;
          continue;
        }
      }
      const matchingPkg = member.activePackages.find((p) => {
        const alreadyUsed = usedCountByPkg[p.id] || 0;
        return p.serviceIds.includes(sid) && p.remainingSessions > alreadyUsed;
      });
      if (matchingPkg) {
        next[sid] = matchingPkg.id;
        usedCountByPkg[matchingPkg.id] = (usedCountByPkg[matchingPkg.id] || 0) + 1;
      }
    }
    return next;
  }

  useEffect(() => {
    let ignore = false;
    async function loadAppointmentMember() {
      if (sourceType === "APPOINTMENT" && activeAppointment?.phoneNumber) {
        const res = await lookupMembersForCheckout(activeAppointment.phoneNumber);
        if (!ignore && res.success && res.data.length > 0) {
          const exact =
            res.data.find((m) => m.id === activeAppointment.customerId) ||
            res.data.find((m) => m.phoneNumber === activeAppointment.phoneNumber) ||
            res.data[0];
          if (
            exact &&
            (exact.isMember ||
              exact.creditBalanceCents > 0 ||
              exact.activePackages.length > 0)
          ) {
            setSelectedMember(exact);
            setPromoRedemptions((prev) =>
              computeAutoPromos(exact, selectedServiceIds, prev)
            );
            return;
          }
        }
        if (!ignore) {
          setSelectedMember(null);
          setPromoRedemptions({});
        }
      }
    }
    loadAppointmentMember();
    return () => {
      ignore = true;
    };
  }, [sourceType, activeAppointment, selectedServiceIds]);

  async function handleMemberSearchChange(val: string) {
    setMemberSearchQuery(val);
    if (val.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setIsSearchingMember(true);
    try {
      const res = await lookupMembersForCheckout(val);
      if (res.success) setMemberSearchResults(res.data);
    } finally {
      setIsSearchingMember(false);
    }
  }

  function handleSelectWalkinMember(member: MemberDto) {
    setSelectedMember(member);
    setWalkinName(member.name);
    setWalkinPhone(member.phoneNumber);
    setMemberSearchQuery("");
    setMemberSearchResults([]);
    setUseMemberCredit(member.creditBalanceCents > 0);
    setPromoRedemptions((prev) =>
      computeAutoPromos(member, selectedServiceIds, prev)
    );
  }

  function togglePromoForService(serviceId: string, memberPackageId: string) {
    setPromoRedemptions((prev) => {
      const next = { ...prev };
      if (next[serviceId] === memberPackageId) delete next[serviceId];
      else next[serviceId] = memberPackageId;
      return next;
    });
  }

  function handleSelectAppointment(aptId: string) {
    setSelectedAppointmentId(aptId);
    const apt = todayAppointments.find((a) => a.id === aptId);
    if (apt) {
      const matchedService = services.find((s) => s.name === apt.serviceName);
      if (matchedService) {
        const nextIds = [matchedService.id];
        setSelectedServiceIds(nextIds);
        setPromoRedemptions((prev) => computeAutoPromos(selectedMember, nextIds, prev));
      }
    }
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => {
      const nextIds = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      setPromoRedemptions((p) => computeAutoPromos(selectedMember, nextIds, p));
      return nextIds;
    });
  }

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalCents = selectedServices.reduce((acc, s) => acc + s.priceCents, 0);
  const promoDiscountCents = selectedServices.reduce(
    (acc, s) => acc + (promoRedemptions[s.id] ? s.priceCents : 0),
    0
  );
  const afterPromoCents = Math.max(0, totalCents - promoDiscountCents);
  const depositPaidCents =
    sourceType === "APPOINTMENT" && activeAppointment?.depositDueCents
      ? activeAppointment.depositDueCents
      : 0;
  const balanceBeforeCreditCents = Math.max(0, afterPromoCents - depositPaidCents);
  const creditDeductedCents =
    selectedMember && useMemberCredit && selectedMember.creditBalanceCents > 0
      ? Math.min(selectedMember.creditBalanceCents, balanceBeforeCreditCents)
      : 0;
  const netPayableCents = Math.max(0, balanceBeforeCreditCents - creditDeductedCents);

  function handleOpenConfirm() {
    setErrorMessage(null);
    if (selectedServiceIds.length === 0) {
      setErrorMessage(t("Select at least 1 item.", "请至少选择 1 项服务或商品。"));
      return;
    }
    if (sourceType === "APPOINTMENT" && !selectedAppointmentId) {
      setErrorMessage(t("Select an appointment.", "请选择要结账的预约。"));
      return;
    }
    checkoutIdempotencyKeyRef.current = generateIdempotencyKey();
    isSubmittingSaleRef.current = false;
    setIsConfirmOpen(true);
  }

  function handleFinalizeSale() {
    if (isSubmittingSaleRef.current) return;
    isSubmittingSaleRef.current = true;
    setErrorMessage(null);
    const key = checkoutIdempotencyKeyRef.current || generateIdempotencyKey();
    checkoutIdempotencyKeyRef.current = key;

    startTransition(async () => {
      try {
        const redemptionArray = Object.entries(promoRedemptions)
          .filter(([sid, pkgId]) => selectedServiceIds.includes(sid) && Boolean(pkgId))
          .map(([serviceId, memberPackageId]) => ({ serviceId, memberPackageId }));

        const res = await recordDeskSale({
          type: sourceType,
          bookingId: sourceType === "APPOINTMENT" ? selectedAppointmentId : undefined,
          customerId: selectedMember?.id,
          customerName:
            sourceType === "WALKIN"
              ? selectedMember?.name || walkinName.trim() || undefined
              : undefined,
          phoneNumber:
            sourceType === "WALKIN"
              ? selectedMember?.phoneNumber || walkinPhone.trim() || undefined
              : undefined,
          serviceIds: selectedServiceIds,
          promoRedemptions: redemptionArray,
          useCreditCents: creditDeductedCents,
          paymentMethod,
          notes: notes.trim() || undefined,
          idempotencyKey: key,
        });

        if (res.success) {
          setIsConfirmOpen(false);
          checkoutIdempotencyKeyRef.current = null;
          const chosenServices = services.filter((s) =>
            selectedServiceIds.includes(s.id)
          );
          onSuccess({
            serviceIds: selectedServiceIds,
            serviceNames: chosenServices.map((s) => s.name),
            totalCents: res.data?.totalCents ?? netPayableCents,
            referenceCode: res.data?.referenceCode,
            creditUsedCents: res.data?.creditUsedCents,
            remainingCreditCents: res.data?.remainingCreditCents,
            customerName: res.data?.customerName,
            customerPhone: res.data?.customerPhone,
          });
        } else {
          setErrorMessage(res.error);
          setIsConfirmOpen(false);
        }
      } finally {
        isSubmittingSaleRef.current = false;
      }
    });
  }

  const pendingAppointments = todayAppointments.filter(
    (a) => a.status === "PENDING" || a.status === "CONFIRMED"
  );

  const hasProducts = services.some((s) => s.type === "PRODUCT");
  const visibleServices = services.filter((s) => {
    if (catalogFilter === "SERVICE") return s.type !== "PRODUCT";
    if (catalogFilter === "PRODUCT") return s.type === "PRODUCT";
    return true;
  });

  const paymentLabel =
    paymentMethod === "CASH"
      ? t("Cash", "现金")
      : paymentMethod === "DUITNOW_QR"
      ? "QR"
      : t("Card", "刷卡");

  const itemCountLabel = isZh
    ? `${selectedServices.length} 项`
    : `${selectedServices.length} ${selectedServices.length === 1 ? "item" : "items"}`;

  return (
    <div className="space-y-5 pb-36 md:pb-6 select-none">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("Back", "返回")}</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t("New Sale", "收银开单")}
          </h1>
        </div>

        {canShowWalkIn && canShowBooked && (
          <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => {
                setSourceType("WALKIN");
                setSelectedAppointmentId("");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                sourceType === "WALKIN"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t("Walk-in", "散客")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceType("APPOINTMENT")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                sourceType === "APPOINTMENT"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>
                {t("Booked", "预约")} ({pendingAppointments.length})
              </span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2 border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Split-Pane POS Workspace (md+ side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Client & Catalog */}
        <div className="md:col-span-7 space-y-4">
          {sourceType === "APPOINTMENT" && (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden max-h-52 overflow-y-auto">
              {pendingAppointments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  {t("No pending appointments today", "今日暂无待结账预约")}
                </p>
              ) : (
                pendingAppointments.map((apt) => {
                  const isSelected = apt.id === selectedAppointmentId;
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => handleSelectAppointment(apt.id)}
                      className={`w-full px-3.5 py-2.5 text-left cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                        isSelected ? "bg-accent" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{apt.customerName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {resolveServiceName(apt.serviceName, languageMode).primary}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {apt.startDatetime.slice(11, 16)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {sourceType === "WALKIN" && !selectedMember && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder={t("Member phone or name…", "搜索会员手机或姓名…")}
                    value={memberSearchQuery}
                    onChange={(e) => handleMemberSearchChange(e.target.value)}
                    className="pl-9 h-9 rounded-lg text-base sm:text-sm bg-card"
                  />
                  {isSearchingMember && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWalkinFields(!showWalkinFields)}
                  className="h-9 rounded-lg text-xs cursor-pointer shrink-0"
                >
                  {showWalkinFields ? t("Hide", "收起") : t("+ Walk-in Info", "+ 填写资料")}
                </Button>
              </div>

              {memberSearchResults.length > 0 && (
                <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden max-h-44 overflow-y-auto">
                  {memberSearchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectWalkinMember(m)}
                      className="w-full px-3.5 py-2.5 hover:bg-muted/40 text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {m.phoneNumber}
                          {m.activePackages.length > 0
                            ? ` · ${m.activePackages.length} ${t("promo", "配套")}`
                            : ""}
                        </div>
                      </div>
                      <span className="font-semibold text-xs text-primary tabular-nums shrink-0">
                        {formatPrice(m.creditBalanceCents, currencySymbol)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showWalkinFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder={t("Customer Name", "顾客姓名")}
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="h-9 rounded-lg text-base sm:text-sm bg-card"
                  />
                  <Input
                    type="tel"
                    placeholder={t("Phone Number", "手机号码")}
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="h-9 rounded-lg text-base sm:text-sm bg-card tabular-nums"
                  />
                </div>
              )}
            </div>
          )}

          {selectedMember && (
            <div className="px-3.5 py-2.5 rounded-xl border border-primary/30 bg-accent/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{selectedMember.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {selectedMember.phoneNumber}
                </span>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {formatPrice(selectedMember.creditBalanceCents, currencySymbol)}
                </span>
                {selectedMember.activePackages.map((pkg) => (
                  <Badge key={pkg.id} variant="secondary" className="text-[11px] tabular-nums">
                    {pkg.name} ({pkg.remainingSessions}/{pkg.totalSessions})
                  </Badge>
                ))}
              </div>
              {sourceType === "WALKIN" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setWalkinName("");
                    setWalkinPhone("");
                    setPromoRedemptions({});
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  aria-label={t("Clear member", "清除会员")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {hasProducts && (
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
              {(["ALL", "SERVICE", "PRODUCT"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCatalogFilter(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    catalogFilter === tab
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "ALL"
                    ? t("All", "全部")
                    : tab === "SERVICE"
                    ? t("Services", "服务")
                    : t("Products", "商品")}
                </button>
              ))}
            </div>
          )}

          {/* Unified Clean POS Catalog List (No clipart or orphan grid cells) */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {visibleServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const svcResolved = resolveServiceName(service.name, languageMode);
              const isPromoCovered = Boolean(promoRedemptions[service.id]);

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? "bg-accent/55" : "hover:bg-muted/35"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/35 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </span>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {svcResolved.primary}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {service.type === "PRODUCT"
                          ? t("Product", "零售商品")
                          : `${service.durationMinutes} min`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    {isPromoCovered ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs line-through text-muted-foreground">
                          {formatPrice(service.priceCents, currencySymbol)}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {currencySymbol} 0.00
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(service.priceCents, currencySymbol)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE (STICKY on md+): Live Order Ticket */}
        <div className="md:col-span-5 md:sticky md:top-6 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm font-bold text-foreground">
              {t("Order Ticket", "结账明细")}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{itemCountLabel}</span>
          </div>

          {selectedServices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {t("Select items from the catalog", "请从左侧选择服务或商品")}
            </p>
          ) : (
            <div className="divide-y divide-border/60 max-h-60 overflow-y-auto">
              {selectedServices.map((s) => {
                const displayName = resolveServiceName(s.name, languageMode).primary;
                const matchingPkg = selectedMember?.activePackages.find((p) =>
                  p.serviceIds.includes(s.id)
                );
                const isRedeemed = Boolean(
                  matchingPkg && promoRedemptions[s.id] === matchingPkg.id
                );

                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm py-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-foreground">{displayName}</div>
                      {matchingPkg && (
                        <button
                          type="button"
                          onClick={() => togglePromoForService(s.id, matchingPkg.id)}
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                            isRedeemed
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Ticket className="h-3 w-3" />
                          <span>
                            {isRedeemed
                              ? t("Promo Applied (-1)", "已使用配套 (-1)")
                              : `${t("Use", "使用")} ${matchingPkg.name}`}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold tabular-nums">
                        {isRedeemed
                          ? `${currencySymbol} 0.00`
                          : formatPrice(s.priceCents, currencySymbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                        aria-label={t(`Remove ${displayName}`, `移除 ${displayName}`)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedMember &&
            selectedMember.creditBalanceCents > 0 &&
            balanceBeforeCreditCents > 0 && (
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40 text-xs font-semibold cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useMemberCredit}
                    onChange={(e) => setUseMemberCredit(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>{t("Deduct Member Credit", "扣除会员余额")}</span>
                </span>
                <span className="text-primary tabular-nums">
                  -{formatPrice(creditDeductedCents, currencySymbol)}
                </span>
              </label>
            )}

          {(promoDiscountCents > 0 || depositPaidCents > 0 || creditDeductedCents > 0) && (
            <div className="space-y-1 pt-2 border-t border-border text-xs tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Subtotal", "小计")}</span>
                <span>{formatPrice(totalCents, currencySymbol)}</span>
              </div>
              {promoDiscountCents > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{t("Promo", "配套抵扣")}</span>
                  <span>-{formatPrice(promoDiscountCents, currencySymbol)}</span>
                </div>
              )}
              {depositPaidCents > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{t("Deposit", "已付定金")}</span>
                  <span>-{formatPrice(depositPaidCents, currencySymbol)}</span>
                </div>
              )}
              {creditDeductedCents > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{t("Credit", "会员余额")}</span>
                  <span>-{formatPrice(creditDeductedCents, currencySymbol)}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            {(
              [
                { id: "CASH", label: t("Cash", "现金"), icon: Banknote },
                { id: "DUITNOW_QR", label: "QR", icon: QrCode },
                { id: "CARD", label: t("Card", "刷卡"), icon: CreditCard },
              ] as const
            ).map((pm) => {
              const active = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <pm.icon className="h-3.5 w-3.5" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          <Input
            placeholder={t("Note (optional)", "备注 (可选)")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 rounded-lg text-base sm:text-xs"
          />

          <div className="hidden md:block pt-1">
            <Button
              type="button"
              onClick={handleOpenConfirm}
              disabled={selectedServiceIds.length === 0}
              className="w-full h-11 rounded-xl font-bold text-sm justify-between px-4 cursor-pointer"
            >
              <span>{t("Collect", "确认收款")}</span>
              <span className="tabular-nums">{formatPrice(netPayableCents, currencySymbol)}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Collect Bar */}
      <div className="md:hidden fixed bottom-[84px] left-0 right-0 z-30 p-3 border-t border-border bg-card/95 backdrop-blur flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {t("Total", "合计")}
          </div>
          <div className="text-lg font-bold tabular-nums text-foreground">
            {formatPrice(netPayableCents, currencySymbol)}
          </div>
        </div>
        <Button
          type="button"
          onClick={handleOpenConfirm}
          disabled={selectedServiceIds.length === 0}
          className="h-10 px-5 rounded-xl font-bold gap-2 cursor-pointer"
        >
          <Receipt className="h-4 w-4" />
          <span>{t("Collect", "确认收款")}</span>
        </Button>
      </div>

      {/* Receipt Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("Confirm Payment", "确认结账")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {sourceType === "APPOINTMENT"
                ? activeAppointment?.customerName
                : selectedMember?.name || walkinName.trim() || t("Walk-in", "散客")}{" "}
              · {paymentLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 border-y border-border text-sm">
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {resolveServiceName(s.name, languageMode).primary}
                  {promoRedemptions[s.id] ? ` (${t("Promo", "配套")})` : ""}
                </span>
                <span className="font-semibold tabular-nums shrink-0">
                  {promoRedemptions[s.id]
                    ? `${currencySymbol} 0.00`
                    : formatPrice(s.priceCents, currencySymbol)}
                </span>
              </div>
            ))}
            {creditDeductedCents > 0 && (
              <div className="flex justify-between text-xs text-primary pt-1 border-t border-border">
                <span>{t("Member Credit", "会员余额")}</span>
                <span className="tabular-nums">
                  -{formatPrice(creditDeductedCents, currencySymbol)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>{t("Amount Due", "实收金额")}</span>
              <span className="text-primary tabular-nums">
                {formatPrice(netPayableCents, currencySymbol)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isPending}
            >
              {t("Back", "返回修改")}
            </Button>
            <Button onClick={handleFinalizeSale} disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{t("Confirm", "完成")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
