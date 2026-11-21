"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  updateDeskAppointmentStatus,
  createDeskAppointment,
  type DeskAppointmentItem,
} from "@/actions/desk";
import {
  formatPrice,
  toBusinessDateString,
  formatSlotTimeRange,
  createBusinessDateTime,
  generateIdempotencyKey,
} from "@/lib/utils";
import { format, addDays } from "date-fns";
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
import type {
  ServiceDto,
  BookingStatus,
  DeskLanguageMode,
  TimeSlot,
  BusinessScheduleDto,
  MemberDto,
} from "@/types";
import { AppointmentMemberSearch } from "@/components/admin/AppointmentMemberSearch";
import {
  DESK_DICT,
  resolveServiceName,
  resolveDeskText,
} from "@/lib/desk-i18n";
import { getAvailableSlots } from "@/actions/booking";
import { getBusinessSchedules } from "@/actions/schedule";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
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
  UserPlus,
  X,
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
  languageMode = "ONLY_EN",
  onBack,
  onRingUpAppointment,
  onRefresh,
}: DeskAppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"CHECKLIST" | "CALENDAR">("CHECKLIST");
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Operating hours & Date restrictions
  const operatingHours = useMemo(() => getOperatingHoursInfo(), []);
  const todayStr = useMemo(() => toBusinessDateString(new Date()), []);
  const tomorrowStr = useMemo(() => toBusinessDateString(addDays(new Date(), 1)), []);
  const minAllowedDate = operatingHours.isPastOperatingHoursToday ? tomorrowStr : todayStr;

  // New Appointment modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    serviceId: services[0]?.id || "",
    date: minAllowedDate,
    slotStartTimeIso: "",
    notes: "",
  });
  const [additionalGuests, setAdditionalGuests] = useState<
    { id: string; serviceId: string; guestLabel: string }[]
  >([]);
  const [schedules, setSchedules] = useState<BusinessScheduleDto[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isZh = languageMode === "ONLY_ZH";

  // Sync default serviceId when services arrive
  useEffect(() => {
    if (services.length > 0 && !addForm.serviceId) {
      setAddForm((prev) => ({ ...prev, serviceId: services[0].id }));
    }
  }, [services, addForm.serviceId]);

  // Load business schedules once when Add modal opens (for closing-time warning)
  useEffect(() => {
    if (!isAddOpen || schedules.length > 0) return;
    getBusinessSchedules().then((res) => {
      if (res.success) setSchedules(res.data);
    });
  }, [isAddOpen, schedules.length]);

  const firstService = services.find((s) => s.id === addForm.serviceId) || services[0];
  const firstDuration = firstService?.durationMinutes || 45;
  const totalDurationMinutes =
    firstDuration +
    additionalGuests.reduce((sum, guest) => {
      const svc = services.find((s) => s.id === guest.serviceId) || services[0];
      return sum + (svc?.durationMinutes || 45);
    }, 0);

  // Fetch available slots whenever isAddOpen, date, or Person 1's duration changes
  useEffect(() => {
    if (!isAddOpen) return;

    const isToday = addForm.date === todayStr;
    if (isToday && operatingHours.isPastOperatingHoursToday) {
      setAvailableSlots([]);
      setAddForm((prev) => ({ ...prev, slotStartTimeIso: "" }));
      return;
    }

    let ignore = false;
    setIsLoadingSlots(true);

    getAvailableSlots(addForm.date, firstDuration)
      .then((res) => {
        if (ignore) return;
        if (res.success) {
          setAvailableSlots(res.data);
          setAddForm((prev) => {
            const hasExisting = res.data.some((s) => s.startTime === prev.slotStartTimeIso);
            return {
              ...prev,
              slotStartTimeIso: hasExisting ? prev.slotStartTimeIso : (res.data[0]?.startTime || ""),
            };
          });
        } else {
          setAvailableSlots([]);
          setAddForm((prev) => ({ ...prev, slotStartTimeIso: "" }));
        }
      })
      .catch((err) => {
        if (ignore) return;
        console.error("Failed to load slots:", err);
        setAvailableSlots([]);
      })
      .finally(() => {
        if (!ignore) setIsLoadingSlots(false);
      });

    return () => {
      ignore = true;
    };
  }, [
    isAddOpen,
    addForm.date,
    firstDuration,
    todayStr,
    operatingHours.isPastOperatingHoursToday,
  ]);

  const closingWarning = useMemo(() => {
    if (!addForm.slotStartTimeIso || !addForm.date) return null;
    const start = new Date(addForm.slotStartTimeIso);
    if (Number.isNaN(start.getTime())) return null;

    const overallEnd = new Date(start.getTime() + totalDurationMinutes * 60000);
    const dayOfWeek = new Date(`${addForm.date}T12:00:00`).getDay();
    const matchedSchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
    const fallbackEndHour = Number(process.env.NEXT_PUBLIC_OPERATING_HOUR_END ?? 19);
    const closeTimeStr =
      matchedSchedule?.closeTime ||
      `${String(fallbackEndHour).padStart(2, "0")}:00`;
    const closingDate = createBusinessDateTime(addForm.date, closeTimeStr);

    if (overallEnd.getTime() <= closingDate.getTime()) return null;

    return {
      closingLabel: format(closingDate, "h:mm a"),
      overallEndLabel: format(overallEnd, "h:mm a"),
    };
  }, [addForm.slotStartTimeIso, addForm.date, totalDurationMinutes, schedules]);

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
        resolveDeskText(DESK_DICT.appointmentView.namePhoneRequired, languageMode).primary
      );
      return;
    }
    if (!addForm.serviceId) {
      setAddError(
        resolveDeskText(DESK_DICT.appointmentView.selectServiceRequired, languageMode).primary
      );
      return;
    }

    const isToday = addForm.date === todayStr;
    if (isToday && operatingHours.isPastOperatingHoursToday) {
      setAddError(
        resolveDeskText(DESK_DICT.appointmentView.pastOperatingHoursNotice, languageMode).primary
      );
      return;
    }

    if (!addForm.slotStartTimeIso) {
      setAddError(
        resolveDeskText(DESK_DICT.appointmentView.selectSlotRequired, languageMode).primary
      );
      return;
    }

    startTransition(async () => {
      const res = await createDeskAppointment({
        customerName: addForm.name.trim(),
        phoneNumber: addForm.phone.trim(),
        serviceId: addForm.serviceId,
        startDatetimeIso: addForm.slotStartTimeIso,
        notes: addForm.notes.trim() || undefined,
        additionalGuests:
          additionalGuests.length > 0
            ? additionalGuests.map((g) => ({
                serviceId: g.serviceId || addForm.serviceId,
                guestLabel: g.guestLabel.trim() || undefined,
              }))
            : undefined,
      });

      if (res.success) {
        setIsAddOpen(false);
        setSelectedMember(null);
        setAddForm({
          name: "",
          phone: "",
          serviceId: services[0]?.id || "",
          date: minAllowedDate,
          slotStartTimeIso: "",
          notes: "",
        });
        setAdditionalGuests([]);
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
          onClick={() => {
            setAddError(null);
            setAddForm({
              name: "",
              phone: "",
              serviceId: services[0]?.id || "",
              date: minAllowedDate,
              slotStartTimeIso: "",
              notes: "",
            });
            setIsAddOpen(true);
          }}
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
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl">
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
            <AppointmentMemberSearch
              selectedMember={selectedMember}
              services={services}
              currencySymbol={currencySymbol}
              isZh={isZh}
              onSelectMember={(member) => {
                setSelectedMember(member);
                const promoSvcId = member.activePackages
                  .flatMap((p) => p.serviceIds)
                  .find((sid) => services.some((s) => s.id === sid));
                setAddForm((prev) => ({
                  ...prev,
                  name: member.name,
                  phone: member.phoneNumber,
                  ...(promoSvcId ? { serviceId: promoSvcId } : {}),
                }));
              }}
              onClearMember={() => {
                setSelectedMember(null);
                setAddForm((prev) => ({ ...prev, name: "", phone: "" }));
              }}
              onQuickSelectService={(serviceId) => {
                setAddForm((prev) => ({ ...prev, serviceId }));
              }}
            />

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
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-bold">
                  {additionalGuests.length > 0 ? (
                    <span>{isZh ? "第 1 位服务" : "Person 1 Service"} *</span>
                  ) : (
                    <>
                      <DeskText
                        text={DESK_DICT.appointmentView.service}
                        mode={languageMode}
                        layout="inline"
                      />{" "}
                      *
                    </>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAdditionalGuests((prev) => [
                      ...prev,
                      {
                        id: generateIdempotencyKey(),
                        serviceId: services[0]?.id || addForm.serviceId || "",
                        guestLabel: "",
                      },
                    ])
                  }
                  className="h-9 sm:h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span>{isZh ? "+ 加人 (连续时段)" : "+ Add Person"}</span>
                </Button>
              </div>
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

            {additionalGuests.map((guest, idx) => (
              <div
                key={guest.id}
                className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {isZh
                      ? `第 ${idx + 2} 位顾客（自动接续下一时段）`
                      : `Person ${idx + 2} (Auto Back-to-Back)`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalGuests((prev) => prev.filter((g) => g.id !== guest.id))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{isZh ? "移除" : "Remove"}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isZh ? `第 ${idx + 2} 位服务 *` : `Person ${idx + 2} Service *`}
                  </Label>
                  <select
                    value={guest.serviceId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setAdditionalGuests((prev) =>
                        prev.map((g) =>
                          g.id === guest.id ? { ...g, serviceId: nextId } : g
                        )
                      );
                    }}
                    className="w-full h-11 rounded-xl border px-3 text-sm font-semibold bg-background"
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isZh
                      ? `第 ${idx + 2} 位备注 / 称呼（选填）`
                      : `Person ${idx + 2} Name / Note (Optional)`}
                  </Label>
                  <Input
                    placeholder={isZh ? "例如：朋友 / 女儿" : "e.g. Friend / Daughter"}
                    value={guest.guestLabel}
                    onChange={(e) => {
                      const nextLabel = e.target.value;
                      setAdditionalGuests((prev) =>
                        prev.map((g) =>
                          g.id === guest.id ? { ...g, guestLabel: nextLabel } : g
                        )
                      );
                    }}
                    className="h-10 text-sm rounded-xl bg-background"
                  />
                </div>
              </div>
            ))}

            {/* Same-day after hours alert banner */}
            {addForm.date === todayStr && operatingHours.isPastOperatingHoursToday && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-bold">
                    <DeskText
                      text={DESK_DICT.appointmentView.pastOperatingHoursTitle}
                      mode={languageMode}
                      layout="inline"
                    />
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">
                    <DeskText
                      text={DESK_DICT.appointmentView.pastOperatingHoursNotice}
                      mode={languageMode}
                      layout="inline"
                    />
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-sm font-bold">
                  <DeskText
                    text={DESK_DICT.appointmentView.date}
                    mode={languageMode}
                    layout="inline"
                  /> *
                </Label>
                <Input
                  type="date"
                  min={minAllowedDate}
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="h-12 text-base rounded-xl w-full"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Label className="text-sm font-bold whitespace-nowrap">
                    <DeskText
                      text={DESK_DICT.appointmentView.timeSlot}
                      mode={languageMode}
                      layout="inline"
                    /> *
                  </Label>
                  {isLoadingSlots ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-normal shrink-0">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <DeskText
                        text={DESK_DICT.appointmentView.loadingSlots}
                        mode={languageMode}
                        layout="inline"
                      />
                    </span>
                  ) : availableSlots.length > 0 ? (
                    <Badge variant="outline" className="text-xs h-5 px-2 font-semibold shrink-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      {availableSlots.length}{" "}
                      <DeskText
                        text={DESK_DICT.appointmentView.slotsAvailableBadge}
                        mode={languageMode}
                        layout="inline"
                      />
                    </Badge>
                  ) : null}
                </div>

                {isLoadingSlots ? (
                  <div className="h-12 rounded-xl border border-dashed flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                    <DeskText
                      text={DESK_DICT.appointmentView.loadingSlots}
                      mode={languageMode}
                      layout="inline"
                    />
                  </div>
                ) : addForm.date === todayStr && operatingHours.isPastOperatingHoursToday ? (
                  <div className="h-12 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center px-3.5 text-sm text-destructive font-medium">
                    <DeskText
                      text={DESK_DICT.appointmentView.pastOperatingHoursTitle}
                      mode={languageMode}
                      layout="inline"
                    />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="h-12 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center px-3.5 text-sm text-amber-700 dark:text-amber-400 font-medium">
                    <DeskText
                      text={DESK_DICT.appointmentView.noSlots}
                      mode={languageMode}
                      layout="inline"
                    />
                  </div>
                ) : (
                  <select
                    value={addForm.slotStartTimeIso}
                    onChange={(e) => setAddForm({ ...addForm, slotStartTimeIso: e.target.value })}
                    className="w-full h-12 rounded-xl border px-3 text-sm font-semibold bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {availableSlots.map((slot) => {
                      const label = formatSlotTimeRange(slot.startTime, slot.endTime);
                      return (
                        <option key={slot.startTime} value={slot.startTime}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            {additionalGuests.length > 0 && addForm.slotStartTimeIso && (
              <div className="p-3 rounded-xl border border-border bg-muted/40 text-xs space-y-1.5 tabular-nums">
                <div className="font-semibold text-foreground">
                  {isZh
                    ? `连续时段预览（共 ${additionalGuests.length + 1} 位 · ${totalDurationMinutes} 分钟）`
                    : `Back-to-Back Schedule (${additionalGuests.length + 1} people · ${totalDurationMinutes}m total)`}
                </div>
                {(() => {
                  let cursor = new Date(addForm.slotStartTimeIso);
                  const rows: { label: string; range: string; isFirst: boolean }[] = [];

                  const p1End = new Date(cursor.getTime() + firstDuration * 60000);
                  rows.push({
                    label: isZh ? "第 1 位：" : "Person 1:",
                    range: formatSlotTimeRange(cursor.toISOString(), p1End.toISOString()),
                    isFirst: true,
                  });
                  cursor = p1End;

                  additionalGuests.forEach((guest, idx) => {
                    const svc = services.find((s) => s.id === guest.serviceId) || services[0];
                    const dur = svc?.durationMinutes || 45;
                    const gEnd = new Date(cursor.getTime() + dur * 60000);
                    rows.push({
                      label: isZh ? `第 ${idx + 2} 位：` : `Person ${idx + 2}:`,
                      range: formatSlotTimeRange(cursor.toISOString(), gEnd.toISOString()),
                      isFirst: false,
                    });
                    cursor = gEnd;
                  });

                  return (
                    <div className="text-muted-foreground space-y-0.5">
                      {rows.map((r) => (
                        <div key={r.label}>
                          <span
                            className={`font-semibold ${
                              r.isFirst ? "text-foreground" : "text-primary"
                            }`}
                          >
                            {r.label}
                          </span>{" "}
                          {r.range}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {closingWarning && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  {isZh
                    ? `注意：预计结束时间为 ${closingWarning.overallEndLabel}，已超过店铺打烊时间（${closingWarning.closingLabel}）。`
                    : `Notice: Combined booking finishes at ${closingWarning.overallEndLabel}, which exceeds shop closing time (${closingWarning.closingLabel}).`}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 gap-2.5 px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isPending}
              className="h-11 sm:h-10 w-full sm:w-auto px-5 text-sm sm:text-base font-semibold rounded-xl"
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
              disabled={
                isPending ||
                isLoadingSlots ||
                availableSlots.length === 0 ||
                !addForm.slotStartTimeIso ||
                (addForm.date === todayStr && operatingHours.isPastOperatingHoursToday)
              }
              className="h-11 sm:h-10 w-full sm:w-auto px-5 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl disabled:opacity-50"
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
