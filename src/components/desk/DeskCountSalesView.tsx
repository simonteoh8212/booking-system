"use client";

import { useState, useTransition } from "react";
import { recordDeskSale, type DeskAppointmentItem } from "@/actions/desk";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ServiceDto, DeskLanguageMode } from "@/types";
import {
  DESK_DICT,
  resolveServiceName,
  resolveDeskText,
} from "@/lib/desk-i18n";
import { DeskText } from "./DeskText";
import {
  ArrowLeft,
  CalendarCheck,
  UserPlus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Receipt,
  User,
} from "lucide-react";

interface DeskCountSalesViewProps {
  services: ServiceDto[];
  todayAppointments: DeskAppointmentItem[];
  initialAppointmentId?: string;
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
  onBack: () => void;
  onSuccess: () => void;
}

export function DeskCountSalesView({
  services,
  todayAppointments,
  initialAppointmentId = "",
  currencySymbol = "RM",
  languageMode = "BILINGUAL_ZH_FIRST",
  onBack,
  onSuccess,
}: DeskCountSalesViewProps) {
  // Mode: Appointment vs Walk-in
  const [sourceType, setSourceType] = useState<"APPOINTMENT" | "WALKIN">(
    initialAppointmentId ? "APPOINTMENT" : "WALKIN"
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(
    initialAppointmentId
  );
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [walkinName, setWalkinName] = useState<string>("");
  const [walkinPhone, setWalkinPhone] = useState<string>("");

  // Default to Hair Cut (剪 / Hair Cut) service for fast 1-tap checkout
  const defaultHairCutId = (() => {
    const hairCut = services.find(
      (s) => s.name.includes("剪") || s.name.toLowerCase().includes("cut")
    );
    return hairCut ? hairCut.id : services[0]?.id;
  })();

  // Multi-selected service IDs (defaults to Hair Cut for walk-in, or appointment service)
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

  // Confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Find currently selected appointment object
  const activeAppointment = todayAppointments.find(
    (a) => a.id === selectedAppointmentId
  );

  // Auto-fill service when an appointment is selected
  function handleSelectAppointment(aptId: string) {
    setSelectedAppointmentId(aptId);
    const apt = todayAppointments.find((a) => a.id === aptId);
    if (apt) {
      const matchedService = services.find((s) => s.name === apt.serviceName);
      if (matchedService) {
        setSelectedServiceIds([matchedService.id]);
      }
    }
  }

  // Toggle service selection in multi-select mode
  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  // Calculate Running Totals
  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id)
  );
  const totalCents = selectedServices.reduce((acc, s) => acc + s.priceCents, 0);

  // If tied to an appointment with a deposit already paid, credit that deposit
  const depositPaidCents =
    sourceType === "APPOINTMENT" && activeAppointment?.depositDueCents
      ? activeAppointment.depositDueCents
      : 0;

  const netPayableCents = Math.max(0, totalCents - depositPaidCents);

  // Validate before showing confirmation modal
  function handleOpenConfirm() {
    setErrorMessage(null);
    if (selectedServiceIds.length === 0) {
      setErrorMessage(
        languageMode === "ONLY_ZH"
          ? "请至少选择 1 个服务项目"
          : "Please select at least 1 service."
      );
      return;
    }

    if (sourceType === "APPOINTMENT" && !selectedAppointmentId) {
      setErrorMessage(
        languageMode === "ONLY_ZH"
          ? "请选择一位预约顾客，或切换为“散客开单”"
          : "Please select an appointment from today's list, or switch to Walk-in."
      );
      return;
    }

    setIsConfirmOpen(true);
  }

  // Final confirmation execution
  function handleFinalizeSale() {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await recordDeskSale({
        type: sourceType,
        bookingId: sourceType === "APPOINTMENT" ? selectedAppointmentId : undefined,
        customerName:
          sourceType === "WALKIN"
            ? walkinName.trim() || undefined
            : undefined,
        phoneNumber:
          sourceType === "WALKIN"
            ? walkinPhone.trim() || undefined
            : undefined,
        serviceIds: selectedServiceIds,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setIsConfirmOpen(false);
        onSuccess();
      } else {
        setErrorMessage(res.error);
        setIsConfirmOpen(false);
      }
    });
  }

  // Filter today's appointments that are still PENDING or CONFIRMED
  const pendingAppointments = todayAppointments.filter(
    (a) => a.status === "PENDING" || a.status === "CONFIRMED"
  );

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto select-none">
      {/* Top Bar with Cancel / Back Button */}
      <div className="flex items-center justify-between border-b pb-4 gap-3">
        <Button
          type="button"
          onClick={onBack}
          size="lg"
          variant="outline"
          className="h-14 sm:h-16 px-6 text-base sm:text-lg font-bold border border-border/80 bg-card hover:bg-muted text-foreground gap-2.5 rounded-2xl shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-6 w-6 text-foreground shrink-0" />
          <DeskText
            text={DESK_DICT.countSalesView.cancelBack}
            mode={languageMode}
            layout="inline"
            primaryClass="font-black text-base sm:text-lg"
          />
        </Button>

        <div className="text-right">
          <DeskText
            text={DESK_DICT.hubCards.countSalesTitle}
            mode={languageMode}
            layout="stack"
            primaryClass="text-xl sm:text-2xl font-black text-foreground"
            secondaryClass="text-xs text-muted-foreground font-semibold"
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center gap-3 border border-destructive/20 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Step 1: Choose Appointment or Walk-in */}
      <div className="space-y-3">
        <Label className="text-base sm:text-lg font-bold text-foreground">
          <DeskText
            text={DESK_DICT.countSalesView.step1Client}
            mode={languageMode}
            layout="inline"
            primaryClass="text-base sm:text-lg font-bold"
          />
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setSourceType("WALKIN");
              setSelectedAppointmentId("");
              if (selectedServiceIds.length === 0 && defaultHairCutId) {
                setSelectedServiceIds([defaultHairCutId]);
              }
            }}
            className={`h-20 sm:h-22 rounded-2xl p-4 flex items-center gap-4 text-left transition-all cursor-pointer ${
              sourceType === "WALKIN"
                ? "border-2 border-foreground bg-muted/40 shadow-xs"
                : "border border-border/80 bg-card hover:bg-muted/30 text-muted-foreground"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                sourceType === "WALKIN"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <DeskText
                text={DESK_DICT.countSalesView.walkinTab}
                mode={languageMode}
                layout="stack"
                primaryClass="text-lg font-bold text-foreground leading-tight"
                secondaryClass="text-xs text-muted-foreground"
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSourceType("APPOINTMENT")}
            className={`h-20 sm:h-22 rounded-2xl p-4 flex items-center gap-4 text-left transition-all cursor-pointer ${
              sourceType === "APPOINTMENT"
                ? "border-2 border-foreground bg-muted/40 shadow-xs"
                : "border border-border/80 bg-card hover:bg-muted/30 text-muted-foreground"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                sourceType === "APPOINTMENT"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <DeskText
                text={DESK_DICT.countSalesView.appointmentTab}
                mode={languageMode}
                layout="stack"
                primaryClass="text-lg font-bold text-foreground leading-tight"
                secondaryClass="text-xs text-muted-foreground"
              />
              <span className="text-[11px] text-muted-foreground font-medium">
                ({pendingAppointments.length} {resolveDeskText(DESK_DICT.breakdown.clientUnit, languageMode).primary})
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Appointment Selection Details */}
      {sourceType === "APPOINTMENT" && (
        <Card className="border border-border/80 bg-muted/20">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <Label className="text-sm sm:text-base font-bold text-foreground">
              {resolveDeskText({ zh: "选择今日已预约的顾客：", en: "Select Scheduled Client:" }, languageMode).primary}
            </Label>
            {pendingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                {resolveDeskText(
                  { zh: "今天暂无等待中的预约，请选择散客开单。", en: "No pending appointments today. Please select Walk-in." },
                  languageMode
                ).primary}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {pendingAppointments.map((apt) => {
                  const isSelected = apt.id === selectedAppointmentId;
                  const svcResolved = resolveServiceName(apt.serviceName, languageMode);
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => handleSelectAppointment(apt.id)}
                      className={`p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-2 border-foreground bg-muted/40 shadow-xs"
                          : "border border-border/80 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-base text-foreground">
                          {apt.customerName}
                        </span>
                        <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded">
                          {apt.startDatetime.slice(11, 16)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <DeskText
                          zh={svcResolved.primary}
                          en={svcResolved.secondary}
                          mode={languageMode}
                          primaryClass="text-xs font-semibold text-foreground/80"
                          secondaryClass="text-[10px] text-muted-foreground ml-1"
                          layout="inline"
                        />
                      </div>
                      {apt.depositDueCents && apt.depositDueCents > 0 ? (
                        <p className="text-xs text-muted-foreground font-semibold mt-1">
                          ✓ {resolveDeskText(DESK_DICT.appointmentView.depositPaidLabel, languageMode).primary}:{" "}
                          {formatPrice(apt.depositDueCents, currencySymbol)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Walk-in Customer Info (Hidden by default, revealed on button click) */}
      {sourceType === "WALKIN" && (
        <div className="pt-1">
          {!showCustomerDetails ? (
            <button
              type="button"
              onClick={() => setShowCustomerDetails(true)}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground/80 hover:text-foreground hover:underline py-2.5 px-4 rounded-xl border border-border/80 bg-card cursor-pointer transition-all shadow-xs"
            >
              <User className="h-4 w-4" />
              <DeskText
                text={DESK_DICT.countSalesView.recordCustomerDetailsBtn}
                mode={languageMode}
                layout="inline"
                primaryClass="font-semibold"
              />
            </button>
          ) : (
            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <DeskText
                    text={{ zh: "顾客信息 (选填)", en: "Customer Details (Optional)" }}
                    mode={languageMode}
                    layout="inline"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerDetails(false);
                    setWalkinName("");
                    setWalkinPhone("");
                  }}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-muted"
                >
                  <DeskText
                    text={DESK_DICT.countSalesView.hideCustomerDetailsBtn}
                    mode={languageMode}
                    layout="inline"
                  />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="walkinName" className="text-xs sm:text-sm font-semibold">
                    <DeskText
                      text={DESK_DICT.appointmentView.customerName}
                      mode={languageMode}
                      layout="inline"
                    />
                  </Label>
                  <Input
                    id="walkinName"
                    placeholder={resolveDeskText(DESK_DICT.countSalesView.customerNamePlaceholder, languageMode).primary}
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="h-11 sm:h-12 text-base font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="walkinPhone" className="text-xs sm:text-sm font-semibold">
                    <DeskText
                      text={DESK_DICT.appointmentView.phoneNumber}
                      mode={languageMode}
                      layout="inline"
                    />
                  </Label>
                  <Input
                    id="walkinPhone"
                    type="tel"
                    placeholder={resolveDeskText(DESK_DICT.countSalesView.customerPhonePlaceholder, languageMode).primary}
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="h-11 sm:h-12 text-base font-medium rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Multi-Select Service Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base sm:text-lg font-bold text-foreground">
            <DeskText
              text={DESK_DICT.countSalesView.step2Services}
              mode={languageMode}
              layout="inline"
              primaryClass="text-base sm:text-lg font-bold"
            />
          </Label>
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground font-mono">
            {selectedServiceIds.length} {resolveDeskText({ zh: "项已选", en: "Selected" }, languageMode).primary}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {services.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            const svcResolved = resolveServiceName(service.name, languageMode);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                className={`min-h-[82px] p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? "border-2 border-emerald-600 bg-card shadow-xs"
                    : "border border-border/80 bg-card hover:border-foreground/30 hover:bg-muted/20 shadow-xs"
                }`}
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    )}
                    <DeskText
                      zh={svcResolved.primary}
                      en={svcResolved.secondary}
                      mode={languageMode}
                      primaryClass="font-bold text-base sm:text-lg leading-tight truncate text-foreground"
                      secondaryClass="text-xs text-muted-foreground font-medium"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-normal pl-0.5">
                    {service.durationMinutes} mins
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base sm:text-lg font-mono font-bold text-foreground">
                    {formatPrice(service.priceCents, currencySymbol)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Payment Method */}
      <div className="space-y-3">
        <Label className="text-base sm:text-lg font-bold text-foreground">
          <DeskText
            text={DESK_DICT.countSalesView.step3Payment}
            mode={languageMode}
            layout="inline"
            primaryClass="text-base sm:text-lg font-bold"
          />
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: "CASH",
              icon: "💵",
              zh: "现金",
              en: "Cash",
            },
            {
              id: "DUITNOW_QR",
              icon: "📱",
              zh: "转账",
              en: currencySymbol === "$" ? "PayID / QR" : "DuitNow QR",
            },
            {
              id: "CARD",
              icon: "💳",
              zh: "刷卡",
              en: currencySymbol === "$" ? "Card / EFTPOS" : "Card",
            },
          ].map((pm) => {
            const isChosen = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id as "CASH" | "DUITNOW_QR" | "CARD")}
                className={`h-16 sm:h-20 rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isChosen
                    ? "border-2 border-foreground bg-muted/40 text-foreground shadow-xs"
                    : "border border-border/80 bg-card hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{pm.icon}</span>
                  <DeskText
                    zh={pm.zh}
                    en={pm.en}
                    mode={languageMode}
                    primaryClass="font-bold text-sm sm:text-base"
                    secondaryClass="text-[10px] text-muted-foreground"
                    layout="stack"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Total Bar & Big Confirm Button */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 fixed sm:sticky bottom-3 left-3 right-3 sm:bottom-4 z-20">
        <div className="space-y-0.5 text-center sm:text-left w-full sm:w-auto">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            <DeskText
              text={DESK_DICT.countSalesView.totalToCollect}
              mode={languageMode}
              layout="inline"
            />
          </p>
          <div className="flex items-baseline gap-2 justify-center sm:justify-start">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground">
              {formatPrice(netPayableCents, currencySymbol)}
            </span>
            {depositPaidCents > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                (Total {formatPrice(totalCents, currencySymbol)} - Dep{" "}
                {formatPrice(depositPaidCents, currencySymbol)})
              </span>
            )}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleOpenConfirm}
          disabled={selectedServiceIds.length === 0}
          size="lg"
          className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2 rounded-xl cursor-pointer transition-colors"
        >
          <Receipt className="h-5 w-5" />
          <DeskText
            text={DESK_DICT.countSalesView.confirmSaleBtn}
            mode={languageMode}
            layout="inline"
            primaryClass="font-bold text-base sm:text-lg"
          />
        </Button>
      </div>

      {/* Confirmation Modal (Receipt Style) */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center mx-auto mb-2 border border-border/80">
              <Receipt className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              <DeskText
                text={DESK_DICT.countSalesView.confirmModalTitle}
                mode={languageMode}
                layout="inline"
              />
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              <DeskText
                text={DESK_DICT.countSalesView.confirmModalDesc}
                mode={languageMode}
                layout="inline"
              />
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-3 p-4 rounded-xl border bg-muted/30 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                <DeskText
                  text={DESK_DICT.countSalesView.modalCustomer}
                  mode={languageMode}
                  layout="inline"
                />
              </span>
              <span className="font-bold text-base">
                {sourceType === "APPOINTMENT"
                  ? activeAppointment?.customerName
                  : walkinName.trim() || resolveDeskText(DESK_DICT.countSalesView.walkinDefault, languageMode).primary}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                <DeskText
                  text={DESK_DICT.countSalesView.modalPaymentMethod}
                  mode={languageMode}
                  layout="inline"
                />
              </span>
              <span className="font-bold font-mono">{paymentMethod}</span>
            </div>

            <div className="border-t pt-2 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                <DeskText
                  text={DESK_DICT.countSalesView.modalServices}
                  mode={languageMode}
                  layout="inline"
                />
                :
              </span>
              {selectedServices.map((s) => {
                const svcResolved = resolveServiceName(s.name, languageMode);
                return (
                  <div key={s.id} className="flex justify-between text-sm py-0.5">
                    <DeskText
                      zh={svcResolved.primary}
                      en={svcResolved.secondary}
                      mode={languageMode}
                      layout="inline"
                      primaryClass="font-medium"
                      secondaryClass="text-xs text-muted-foreground"
                    />
                    <span className="font-mono font-bold">
                      {formatPrice(s.priceCents, currencySymbol)}
                    </span>
                  </div>
                );
              })}
            </div>

            {depositPaidCents > 0 && (
              <div className="flex justify-between text-xs text-green-600 pt-1 border-t">
                <span>
                  <DeskText
                    text={DESK_DICT.countSalesView.modalDepositDeduction}
                    mode={languageMode}
                    layout="inline"
                  />
                </span>
                <span className="font-mono font-bold">
                  - {formatPrice(depositPaidCents, currencySymbol)}
                </span>
              </div>
            )}

            <div className="border-t-2 border-dashed pt-2 flex justify-between items-baseline font-bold text-lg">
              <span>
                <DeskText
                  text={DESK_DICT.countSalesView.modalAmountCollected}
                  mode={languageMode}
                  layout="inline"
                />
              </span>
              <span className="text-2xl font-black font-mono text-primary">
                {formatPrice(netPayableCents, currencySymbol)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isPending}
              className="h-12 text-base font-semibold rounded-xl"
            >
              <DeskText
                text={DESK_DICT.countSalesView.modalCancelBtn}
                mode={languageMode}
                layout="inline"
              />
            </Button>
            <Button
              type="button"
              onClick={handleFinalizeSale}
              disabled={isPending}
              className="h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white gap-2 rounded-xl"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <DeskText
                    text={DESK_DICT.countSalesView.modalSavingBtn}
                    mode={languageMode}
                    layout="inline"
                    secondaryClass="text-xs text-white/80 font-normal"
                  />
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <DeskText
                    text={DESK_DICT.countSalesView.modalConfirmBtn}
                    mode={languageMode}
                    layout="inline"
                    secondaryClass="text-xs text-white/80 font-normal"
                  />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
