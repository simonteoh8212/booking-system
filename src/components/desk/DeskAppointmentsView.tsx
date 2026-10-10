"use client";

import { useState, useTransition } from "react";
import {
  updateDeskAppointmentStatus,
  createDeskAppointment,
  type DeskAppointmentItem,
} from "@/actions/desk";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ServiceDto, BookingStatus, DeskLanguageMode } from "@/types";
import {
  DESK_DICT,
  resolveServiceName,
  resolveDeskText,
} from "@/lib/desk-i18n";
import { DeskText } from "./DeskText";
import {
  ArrowLeft,
  CalendarDays,
  ListTodo,
  Plus,
  CheckCircle2,
  Clock,
  MessageCircle,
  Loader2,
  CalendarCheck,
  AlertCircle,
  Receipt,
  User,
  Phone,
} from "lucide-react";

interface DeskAppointmentsViewProps {
  appointments: DeskAppointmentItem[];
  services: ServiceDto[];
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
  onBack: () => void;
  onRingUpAppointment: (appointmentId: string) => void;
  onRefresh: () => void;
}

export function DeskAppointmentsView({
  appointments,
  services,
  currencySymbol = "RM",
  languageMode = "BILINGUAL_ZH_FIRST",
  onBack,
  onRingUpAppointment,
  onRefresh,
}: DeskAppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"CHECKLIST" | "CALENDAR">("CHECKLIST");
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // New Appointment modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    serviceId: services[0]?.id || "",
    time: "10:00",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handle 1-Tap status change
  function handleMarkStatus(bookingId: string, status: BookingStatus) {
    startTransition(async () => {
      const res = await updateDeskAppointmentStatus(bookingId, status);
      if (res.success) {
        onRefresh();
      }
    });
  }

  // Handle New Manual Appointment Submit
  function handleCreateAppointment() {
    setAddError(null);
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError(
        languageMode === "ONLY_ZH"
          ? "请填写顾客姓名与手机号码"
          : "Customer name and phone number are required."
      );
      return;
    }

    startTransition(async () => {
      const startIso = new Date(`${addForm.date}T${addForm.time}:00`).toISOString();
      const res = await createDeskAppointment({
        customerName: addForm.name.trim(),
        phoneNumber: addForm.phone.trim(),
        serviceId: addForm.serviceId,
        startDatetimeIso: startIso,
        notes: addForm.notes.trim() || undefined,
      });

      if (res.success) {
        setIsAddOpen(false);
        setAddForm({
          name: "",
          phone: "",
          serviceId: services[0]?.id || "",
          time: "10:00",
          date: format(new Date(), "yyyy-MM-dd"),
          notes: "",
        });
        onRefresh();
      } else {
        setAddError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto select-none">
      {/* Obvious Back Button for 50yo User */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button
          type="button"
          onClick={onBack}
          size="lg"
          variant="outline"
          className="h-14 sm:h-16 px-6 text-base sm:text-lg font-bold border border-border/80 bg-card hover:bg-muted text-foreground gap-2.5 rounded-2xl shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-6 w-6 text-foreground shrink-0" />
          <DeskText
            text={DESK_DICT.appointmentView.backToMain}
            mode={languageMode}
            layout="inline"
            primaryClass="font-black text-base sm:text-lg"
          />
        </Button>

        <Button
          type="button"
          onClick={() => setIsAddOpen(true)}
          size="lg"
          className="h-14 sm:h-16 px-6 text-base sm:text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-2xl shadow-md cursor-pointer"
        >
          <Plus className="h-6 w-6" />
          <DeskText
            text={DESK_DICT.appointmentView.addAppointmentBtn}
            mode={languageMode}
            layout="inline"
            primaryClass="font-extrabold text-base sm:text-lg"
          />
        </Button>
      </div>

      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <DeskText
            text={DESK_DICT.hubCards.makeAppointmentTitle}
            mode={languageMode}
            layout="stack"
            primaryClass="text-2xl sm:text-3xl font-black tracking-tight text-foreground"
            secondaryClass="text-sm sm:text-base font-semibold text-muted-foreground"
          />
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            {resolveDeskText(DESK_DICT.hubCards.makeAppointmentSub, languageMode).primary}
          </p>
        </div>

        {/* Large Toggle: Checklist vs Calendar */}
        <div className="flex bg-muted p-1.5 rounded-2xl border gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("CHECKLIST")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
              viewMode === "CHECKLIST"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListTodo className="h-5 w-5" />
            <DeskText
              text={DESK_DICT.appointmentView.checklistTab}
              mode={languageMode}
              layout="inline"
              primaryClass="font-bold"
            />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("CALENDAR")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
              viewMode === "CALENDAR"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            <DeskText
              text={DESK_DICT.appointmentView.calendarTab}
              mode={languageMode}
              layout="inline"
              primaryClass="font-bold"
            />
          </button>
        </div>
      </div>

      {/* 1. CHECKLIST VIEW (Non-Calendar) */}
      {viewMode === "CHECKLIST" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm sm:text-base font-bold text-muted-foreground bg-muted/40 p-3.5 rounded-xl border">
            <span className="flex items-center gap-1.5">
              <DeskText
                text={DESK_DICT.appointmentView.appointmentsHeader}
                mode={languageMode}
                layout="inline"
                primaryClass="font-bold text-foreground"
              />
              <span className="font-mono text-primary">({appointments.length})</span>
            </span>
            <span className="text-primary font-mono text-xs sm:text-sm">
              {format(new Date(), "EEEE, d MMM yyyy")}
            </span>
          </div>

          {appointments.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CalendarCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">
                <DeskText
                  text={DESK_DICT.appointmentView.noAppointmentsTitle}
                  mode={languageMode}
                  layout="inline"
                />
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                <DeskText
                  text={DESK_DICT.appointmentView.noAppointmentsSub}
                  mode={languageMode}
                  layout="inline"
                />
              </p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {appointments.map((apt) => {
                const isCompleted = apt.status === "COMPLETED";
                const isCancelled = apt.status === "CANCELLED";
                const timeDisplay = format(new Date(apt.startDatetime), "h:mm a");
                const svcResolved = resolveServiceName(apt.serviceName, languageMode);

                return (
                  <Card
                    key={apt.id}
                    className={`border-2 transition-all p-4 sm:p-5 ${
                      isCompleted
                        ? "bg-muted/30 border-muted opacity-80"
                        : isCancelled
                        ? "bg-destructive/5 border-destructive/20 opacity-60"
                        : "bg-card border-border hover:border-primary/40 shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Time & Customer Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-base sm:text-lg font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                            {timeDisplay}
                          </span>
                          <span className="text-lg sm:text-xl font-extrabold text-foreground">
                            {apt.customerName}
                          </span>
                          <Badge
                            variant={
                              isCompleted
                                ? "default"
                                : isCancelled
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-bold text-xs"
                          >
                            {apt.status}
                          </Badge>
                        </div>

                        {/* Service Name with dynamic language preference */}
                        <div>
                          <DeskText
                            zh={svcResolved.primary}
                            en={svcResolved.secondary}
                            mode={languageMode}
                            primaryClass="text-base font-bold text-foreground"
                            secondaryClass="text-xs text-muted-foreground font-normal"
                          />
                        </div>

                        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3.5 w-3.5" />
                            {apt.phoneNumber}
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {resolveDeskText(DESK_DICT.appointmentView.feeLabel, languageMode).primary}:{" "}
                            {formatPrice(apt.totalPriceCents, currencySymbol)}
                          </span>
                          {apt.depositDueCents && apt.depositDueCents > 0 ? (
                            <span className="text-green-600 font-bold">
                              {resolveDeskText(DESK_DICT.appointmentView.depositPaidLabel, languageMode).primary}:{" "}
                              {formatPrice(apt.depositDueCents, currencySymbol)}
                            </span>
                          ) : null}
                          <span className="font-mono text-[11px] opacity-70">
                            Ref: {apt.referenceCode}
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        {/* WhatsApp CTA */}
                        {apt.phoneNumber && (
                          <a
                            href={`https://wa.me/${apt.phoneNumber.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-xl border hover:bg-muted text-green-600"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}

                        {!isCompleted && !isCancelled && (
                          <>
                            {/* Ring up sale */}
                            <Button
                              type="button"
                              onClick={() => onRingUpAppointment(apt.id)}
                              size="sm"
                              variant="outline"
                              className="h-12 px-4 text-sm font-bold border border-border/80 bg-card hover:bg-muted text-foreground gap-1.5 rounded-xl shadow-xs cursor-pointer"
                            >
                              <Receipt className="h-4 w-4" />
                              <DeskText
                                text={DESK_DICT.appointmentView.ringUpBtn}
                                mode={languageMode}
                                layout="inline"
                              />
                            </Button>

                            {/* Mark completed */}
                            <Button
                              type="button"
                              onClick={() => handleMarkStatus(apt.id, "COMPLETED")}
                              disabled={isPending}
                              size="sm"
                              className="h-12 px-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <DeskText
                                text={DESK_DICT.appointmentView.markDoneBtn}
                                mode={languageMode}
                                layout="inline"
                              />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CALENDAR VIEW */}
      {viewMode === "CALENDAR" && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-foreground">
              <DeskText
                text={DESK_DICT.hubCards.makeAppointmentTitle}
                mode={languageMode}
                layout="inline"
              />
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="w-48 h-11 text-sm font-semibold rounded-xl"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border text-center text-muted-foreground text-sm space-y-1">
            <Clock className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="font-bold text-foreground">
              Schedule for {selectedDateStr}
            </p>
            <p className="text-xs">
              Showing filtered records for this selected date. Use checklist above to mark completions.
            </p>
          </div>
        </Card>
      )}

      {/* ADD APPOINTMENT MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              <DeskText
                text={DESK_DICT.appointmentView.modalTitle}
                mode={languageMode}
                layout="inline"
              />
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Book a client slot directly into today&apos;s salon schedule
            </DialogDescription>
          </DialogHeader>

          {addError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">
                <DeskText
                  text={DESK_DICT.appointmentView.customerName}
                  mode={languageMode}
                  layout="inline"
                />{" "}
                *
              </Label>
              <Input
                placeholder="e.g. Jenny Tan"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="h-12 text-base rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">
                <DeskText
                  text={DESK_DICT.appointmentView.phoneNumber}
                  mode={languageMode}
                  layout="inline"
                />{" "}
                *
              </Label>
              <Input
                placeholder="e.g. 0123456789"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="h-12 text-base rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">
                <DeskText
                  text={DESK_DICT.appointmentView.service}
                  mode={languageMode}
                  layout="inline"
                />{" "}
                *
              </Label>
              <select
                value={addForm.serviceId}
                onChange={(e) => setAddForm({ ...addForm, serviceId: e.target.value })}
                className="w-full h-12 rounded-xl border px-3 text-base font-semibold bg-background"
              >
                {services.map((s) => {
                  const resolved = resolveServiceName(s.name, languageMode);
                  const label = resolved.secondary
                    ? `${resolved.primary} (${resolved.secondary})`
                    : resolved.primary;
                  return (
                    <option key={s.id} value={s.id}>
                      {label} — {formatPrice(s.priceCents, currencySymbol)} ({s.durationMinutes}m)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">
                  <DeskText
                    text={DESK_DICT.appointmentView.date}
                    mode={languageMode}
                    layout="inline"
                  />
                </Label>
                <Input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="h-12 text-base rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">
                  <DeskText
                    text={DESK_DICT.appointmentView.time}
                    mode={languageMode}
                    layout="inline"
                  />
                </Label>
                <Input
                  type="time"
                  value={addForm.time}
                  onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                  className="h-12 text-base rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isPending}
              className="h-12 text-base font-semibold rounded-xl"
            >
              <DeskText
                text={DESK_DICT.appointmentView.cancel}
                mode={languageMode}
                layout="inline"
              />
            </Button>
            <Button
              type="button"
              onClick={handleCreateAppointment}
              disabled={isPending}
              className="h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <DeskText
                    text={DESK_DICT.appointmentView.savingBooking}
                    mode={languageMode}
                    layout="inline"
                  />
                </>
              ) : (
                <DeskText
                  text={DESK_DICT.appointmentView.confirmBooking}
                  mode={languageMode}
                  layout="inline"
                />
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
