"use client";

import { useEffect, useRef, useState } from "react";
import { toBusinessDateString } from "@/lib/utils";
import { resolveServiceName } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Moon,
  Clock,
  Check,
  Loader2,
  CalendarDays,
} from "lucide-react";

export interface DailyBriefingItem {
  id: string;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  startDatetime: string; // ISO string
  status: string; // "PENDING" | "CONFIRMED"
}

interface DailyBriefingDialogProps {
  appointments: DailyBriefingItem[];
  languageMode?: DeskLanguageMode;
  suppressAutoOpen?: boolean;
  onConfirmBooking?: (id: string) => Promise<void> | void;
  onCheckoutBooking?: (id: string) => void;
  onViewAgenda?: () => void;
}

const BRIEFING_SEEN_PREFIX = "daily_briefing_seen_";
const BRIEFING_MUTED_KEY = "daily_briefing_muted";

function getMalaysiaHour(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "12";
  const parsed = parseInt(hourStr, 10);
  return Number.isNaN(parsed) ? 12 : parsed % 24;
}

function getTimeOfDayGreeting(isZh: boolean): {
  greeting: string;
  period: "morning" | "afternoon" | "evening";
} {
  const hour = getMalaysiaHour();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: isZh ? "早上好！" : "Good Morning!",
      period: "morning",
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      greeting: isZh ? "下午好！" : "Good Afternoon!",
      period: "afternoon",
    };
  }
  return {
    greeting: isZh ? "晚上好！" : "Good Evening!",
    period: "evening",
  };
}

export function DailyBriefingDialog({
  appointments,
  languageMode = "ONLY_EN",
  suppressAutoOpen = false,
  onConfirmBooking,
  onCheckoutBooking,
  onViewAgenda,
}: DailyBriefingDialogProps) {
  const isZh = languageMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [open, setOpen] = useState(false);
  const [muteChecked, setMuteChecked] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const hasEvaluatedRef = useRef(false);

  const todayKey = toBusinessDateString(new Date());

  const upcomingAppointments = appointments
    .filter((a) => a.status === "PENDING" || a.status === "CONFIRMED")
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));

  const pendingCount = upcomingAppointments.filter(
    (a) => a.status === "PENDING"
  ).length;
  const confirmedCount = upcomingAppointments.filter(
    (a) => a.status === "CONFIRMED"
  ).length;

  useEffect(() => {
    if (suppressAutoOpen || hasEvaluatedRef.current) return;
    if (upcomingAppointments.length === 0) {
      hasEvaluatedRef.current = true;
      return;
    }

    hasEvaluatedRef.current = true;

    const timer = window.setTimeout(() => {
      try {
        const isMuted = localStorage.getItem(BRIEFING_MUTED_KEY) === "true";
        const alreadySeenToday =
          localStorage.getItem(`${BRIEFING_SEEN_PREFIX}${todayKey}`) === "true";
        if (isMuted || alreadySeenToday) return;

        localStorage.setItem(`${BRIEFING_SEEN_PREFIX}${todayKey}`, "true");
        setMuteChecked(false);
        setOpen(true);
      } catch {
        // Ignore storage restrictions
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [suppressAutoOpen, todayKey, upcomingAppointments.length]);

  function handleDismiss(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      try {
        localStorage.setItem(`${BRIEFING_SEEN_PREFIX}${todayKey}`, "true");
        if (muteChecked) {
          localStorage.setItem(BRIEFING_MUTED_KEY, "true");
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  function handleMuteToggle(checked: boolean) {
    setMuteChecked(checked);
    try {
      if (checked) {
        localStorage.setItem(BRIEFING_MUTED_KEY, "true");
      } else {
        localStorage.removeItem(BRIEFING_MUTED_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  async function handleConfirm(id: string) {
    if (!onConfirmBooking || confirmingId) return;
    setConfirmingId(id);
    try {
      await onConfirmBooking(id);
    } finally {
      setConfirmingId(null);
    }
  }

  const { greeting, period } = getTimeOfDayGreeting(isZh);
  const formattedToday = new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {period === "evening" ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold leading-snug">
                {greeting} {t("Today's Schedule", "今日预约安排")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {formattedToday} ·{" "}
                {t(
                  `${upcomingAppointments.length} upcoming`,
                  `今日共 ${upcomingAppointments.length} 位预约`
                )}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {pendingCount > 0 && (
              <Badge className="text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 tabular-nums">
                {t(`${pendingCount} pending`, `${pendingCount} 待确认`)}
              </Badge>
            )}
            {confirmedCount > 0 && (
              <Badge className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/15 tabular-nums">
                {t(`${confirmedCount} confirmed`, `${confirmedCount} 已确认`)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Upcoming List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card min-h-[120px]">
          {upcomingAppointments.map((apt) => {
            const timeStr = new Intl.DateTimeFormat("en-US", {
              timeZone: "Asia/Kuala_Lumpur",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(new Date(apt.startDatetime));
            const serviceLabel = resolveServiceName(
              apt.serviceName,
              languageMode
            ).primary;
            const isPendingStatus = apt.status === "PENDING";

            return (
              <div
                key={apt.id}
                className="p-3 flex items-center justify-between gap-3 transition-colors hover:bg-muted/35"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary tabular-nums">
                      <Clock className="h-3 w-3 shrink-0" />
                      {timeStr}
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {apt.customerName}
                    </span>
                    {isPendingStatus && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                        {t("Pending", "待确认")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {serviceLabel}
                    {apt.phoneNumber && !apt.phoneNumber.startsWith("WALKIN-")
                      ? ` · ${apt.phoneNumber}`
                      : ""}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isPendingStatus && onConfirmBooking && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={confirmingId === apt.id}
                      onClick={() => void handleConfirm(apt.id)}
                      className="h-9 sm:h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {confirmingId === apt.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 text-emerald-600" />
                      )}
                      <span>{t("Confirm", "确认")}</span>
                    </Button>
                  )}
                  {onCheckoutBooking && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleDismiss(false);
                        onCheckoutBooking(apt.id);
                      }}
                      className="h-9 sm:h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {t("Checkout", "结账")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-1 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={muteChecked}
              onChange={(e) => handleMuteToggle(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary focus:ring-primary cursor-pointer"
            />
            <span>
              {t(
                "Don't auto-show daily popup on this device",
                "此设备不再自动弹出每日提醒"
              )}
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 pt-1 shrink-0 flex-col-reverse sm:flex-row">
          {onViewAgenda && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleDismiss(false);
                onViewAgenda();
              }}
              className="h-10 sm:h-9 w-full sm:w-auto gap-1.5 rounded-xl font-semibold cursor-pointer"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{t("View Full Schedule", "查看完整日程")}</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={() => handleDismiss(false)}
            className="h-10 sm:h-9 w-full sm:w-auto px-5 rounded-xl font-semibold cursor-pointer"
          >
            {t("Got It", "知道了")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
