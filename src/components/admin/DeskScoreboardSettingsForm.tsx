"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateDeskScoreboardSettings } from "@/actions/deposit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DepositSettingDto } from "@/types";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { FloatingSaveBtn } from "@/components/admin/FloatingSaveBtn";
import {
  SlidersHorizontal,
  TrendingUp,
  History,
  CalendarRange,
  CalendarDays,
  Scissors,
  Eye,
  EyeOff,
  UserPlus,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

interface DeskScoreboardSettingsFormProps {
  initialSetting: DepositSettingDto;
}

export function DeskScoreboardSettingsForm({
  initialSetting,
}: DeskScoreboardSettingsFormProps) {
  const { langMode } = useDeskLanguage(initialSetting.deskLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const initialVisibility = {
    showTodaySales: initialSetting.showTodaySales ?? true,
    showYesterdaySales: initialSetting.showYesterdaySales ?? true,
    showMonthlySales: initialSetting.showMonthlySales ?? true,
    showServiceBreakdown: initialSetting.showServiceBreakdown ?? true,
    showMakeAppointment: initialSetting.showMakeAppointment ?? true,
    showWalkIn: initialSetting.showWalkIn ?? true,
    showBookedCheckout: initialSetting.showBookedCheckout ?? true,
  };

  const [draft, setDraft] = useState(initialVisibility);
  const [savedSetting, setSavedSetting] = useState(initialVisibility);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    draft.showTodaySales !== savedSetting.showTodaySales ||
    draft.showYesterdaySales !== savedSetting.showYesterdaySales ||
    draft.showMonthlySales !== savedSetting.showMonthlySales ||
    draft.showServiceBreakdown !== savedSetting.showServiceBreakdown ||
    draft.showMakeAppointment !== savedSetting.showMakeAppointment ||
    draft.showWalkIn !== savedSetting.showWalkIn ||
    draft.showBookedCheckout !== savedSetting.showBookedCheckout;

  function handleDiscard() {
    setDraft(savedSetting);
    setErrorMessage(null);
  }

  function handleHideAll() {
    setDraft((prev) => ({
      ...prev,
      showTodaySales: false,
      showYesterdaySales: false,
      showMonthlySales: false,
      showServiceBreakdown: false,
      showMakeAppointment: false,
    }));
  }

  function handleShowAll() {
    setDraft((prev) => ({
      ...prev,
      showTodaySales: true,
      showYesterdaySales: true,
      showMonthlySales: true,
      showServiceBreakdown: true,
      showMakeAppointment: true,
    }));
  }

  function toggleField(key: keyof typeof draft) {
    if (key === "showWalkIn" && draft.showWalkIn && !draft.showBookedCheckout) {
      toast.error(t("Keep at least one checkout mode enabled.", "至少保留一种开单方式。"));
      return;
    }
    if (key === "showBookedCheckout" && draft.showBookedCheckout && !draft.showWalkIn) {
      toast.error(t("Keep at least one checkout mode enabled.", "至少保留一种开单方式。"));
      return;
    }
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const scoreboardToggles = [
    draft.showTodaySales,
    draft.showYesterdaySales,
    draft.showMonthlySales,
    draft.showServiceBreakdown,
    draft.showMakeAppointment,
  ];
  const activeCount = scoreboardToggles.filter(Boolean).length;
  const allHidden = activeCount === 0;
  const allShown = activeCount === scoreboardToggles.length;

  function handleSave() {
    setErrorMessage(null);
    const payload = { ...draft };
    startTransition(async () => {
      const res = await updateDeskScoreboardSettings(payload);

      if (res.success) {
        setSavedSetting(payload);

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("desk_scoreboard_visibility", JSON.stringify(payload));
          } catch {}
        }

        toast.success(t("Desk display settings saved.", "前台显示设置已保存。"));
      } else {
        const err = res.error || t("Failed to save settings.", "保存设置失败。");
        toast.error(err);
        setErrorMessage(err);
      }
    });
  }

  const toggleRows = [
    {
      key: "today",
      label: t("Today's Sales", "今日营业额"),
      value: draft.showTodaySales,
      onToggle: () => toggleField("showTodaySales"),
      icon: TrendingUp,
    },
    {
      key: "yesterday",
      label: t("Yesterday's Sales", "昨日营业额"),
      value: draft.showYesterdaySales,
      onToggle: () => toggleField("showYesterdaySales"),
      icon: History,
    },
    {
      key: "monthly",
      label: t("Monthly Sales", "本月营业额"),
      value: draft.showMonthlySales,
      onToggle: () => toggleField("showMonthlySales"),
      icon: CalendarRange,
    },
    {
      key: "breakdown",
      label: t("Service Breakdown", "服务销量明细"),
      value: draft.showServiceBreakdown,
      onToggle: () => toggleField("showServiceBreakdown"),
      icon: Scissors,
    },
    {
      key: "appointment",
      label: t("New Appointment Shortcut", "新建预约入口"),
      value: draft.showMakeAppointment,
      onToggle: () => toggleField("showMakeAppointment"),
      icon: CalendarDays,
    },
    {
      key: "walkin",
      label: t("Walk-in Checkout", "散客直接开单"),
      value: draft.showWalkIn,
      onToggle: () => toggleField("showWalkIn"),
      icon: UserPlus,
    },
    {
      key: "booked",
      label: t("Booked Checkout", "预约顾客结账"),
      value: draft.showBookedCheckout,
      onToggle: () => toggleField("showBookedCheckout"),
      icon: CalendarCheck,
    },
  ];

  return (
    <>
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
              <span suppressHydrationWarning>{t("Desk Display", "前台显示")}</span>
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                ({activeCount}/{scoreboardToggles.length})
              </span>
            </CardTitle>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleHideAll}
                disabled={isPending || allHidden}
                className="text-xs cursor-pointer h-8 gap-1"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span suppressHydrationWarning>{t("Hide All", "全部隐藏")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShowAll}
                disabled={isPending || allShown}
                className="text-xs cursor-pointer h-8 gap-1"
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span suppressHydrationWarning>{t("Show All", "全部显示")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {toggleRows.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.key}
                  type="button"
                  role="switch"
                  aria-checked={row.value}
                  onClick={row.onToggle}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-left touch-manipulation select-none"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        row.value ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className="text-sm font-medium text-foreground truncate"
                      suppressHydrationWarning
                    >
                      {row.label}
                    </span>
                  </span>

                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      row.value ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                        row.value ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <FloatingSaveBtn
        show={hasChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
        isPending={isPending}
        title={t("Unsaved Changes", "未保存的设置")}
        description={t("Save desk display changes.", "保存前台显示设置。")}
        saveText={t("Save", "保存")}
        langMode={langMode}
      />
    </>
  );
}
