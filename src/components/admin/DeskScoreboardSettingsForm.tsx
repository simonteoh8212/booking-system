"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { updateDeskScoreboardSettings } from "@/actions/deposit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DepositSettingDto } from "@/types";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";
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
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  CalendarCheck,
} from "lucide-react";

interface DeskScoreboardSettingsFormProps {
  initialSetting: DepositSettingDto;
}

export function DeskScoreboardSettingsForm({
  initialSetting,
}: DeskScoreboardSettingsFormProps) {
  const { langMode } = useDeskLanguage(initialSetting.deskLanguage);

  const [showTodaySales, setShowTodaySales] = useState<boolean>(
    initialSetting.showTodaySales ?? true
  );
  const [showYesterdaySales, setShowYesterdaySales] = useState<boolean>(
    initialSetting.showYesterdaySales ?? true
  );
  const [showMonthlySales, setShowMonthlySales] = useState<boolean>(
    initialSetting.showMonthlySales ?? true
  );
  const [showServiceBreakdown, setShowServiceBreakdown] = useState<boolean>(
    initialSetting.showServiceBreakdown ?? true
  );
  const [showMakeAppointment, setShowMakeAppointment] = useState<boolean>(
    initialSetting.showMakeAppointment ?? true
  );
  const [showWalkIn, setShowWalkIn] = useState<boolean>(
    initialSetting.showWalkIn ?? true
  );
  const [showBookedCheckout, setShowBookedCheckout] = useState<boolean>(
    initialSetting.showBookedCheckout ?? true
  );

  // Baseline state to track dirty / unsaved changes
  const [savedSetting, setSavedSetting] = useState({
    showTodaySales: initialSetting.showTodaySales ?? true,
    showYesterdaySales: initialSetting.showYesterdaySales ?? true,
    showMonthlySales: initialSetting.showMonthlySales ?? true,
    showServiceBreakdown: initialSetting.showServiceBreakdown ?? true,
    showMakeAppointment: initialSetting.showMakeAppointment ?? true,
    showWalkIn: initialSetting.showWalkIn ?? true,
    showBookedCheckout: initialSetting.showBookedCheckout ?? true,
  });

  // Check if any setting differs from saved state
  const hasChanges =
    showTodaySales !== savedSetting.showTodaySales ||
    showYesterdaySales !== savedSetting.showYesterdaySales ||
    showMonthlySales !== savedSetting.showMonthlySales ||
    showServiceBreakdown !== savedSetting.showServiceBreakdown ||
    showMakeAppointment !== savedSetting.showMakeAppointment ||
    showWalkIn !== savedSetting.showWalkIn ||
    showBookedCheckout !== savedSetting.showBookedCheckout;

  function handleDiscard() {
    setShowTodaySales(savedSetting.showTodaySales);
    setShowYesterdaySales(savedSetting.showYesterdaySales);
    setShowMonthlySales(savedSetting.showMonthlySales);
    setShowServiceBreakdown(savedSetting.showServiceBreakdown);
    setShowMakeAppointment(savedSetting.showMakeAppointment);
    setShowWalkIn(savedSetting.showWalkIn);
    setShowBookedCheckout(savedSetting.showBookedCheckout);
    setErrorMessage(null);
  }

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync if initialSetting prop changes from parent
  useEffect(() => {
    const updated = {
      showTodaySales: initialSetting.showTodaySales ?? true,
      showYesterdaySales: initialSetting.showYesterdaySales ?? true,
      showMonthlySales: initialSetting.showMonthlySales ?? true,
      showServiceBreakdown: initialSetting.showServiceBreakdown ?? true,
      showMakeAppointment: initialSetting.showMakeAppointment ?? true,
      showWalkIn: initialSetting.showWalkIn ?? true,
      showBookedCheckout: initialSetting.showBookedCheckout ?? true,
    };
    setShowTodaySales(updated.showTodaySales);
    setShowYesterdaySales(updated.showYesterdaySales);
    setShowMonthlySales(updated.showMonthlySales);
    setShowServiceBreakdown(updated.showServiceBreakdown);
    setShowMakeAppointment(updated.showMakeAppointment);
    setShowWalkIn(updated.showWalkIn);
    setShowBookedCheckout(updated.showBookedCheckout);
    setSavedSetting(updated);
  }, [initialSetting]);

  function handleHideAll() {
    setShowTodaySales(false);
    setShowYesterdaySales(false);
    setShowMonthlySales(false);
    setShowServiceBreakdown(false);
    setShowMakeAppointment(false);
  }

  function handleShowAll() {
    setShowTodaySales(true);
    setShowYesterdaySales(true);
    setShowMonthlySales(true);
    setShowServiceBreakdown(true);
    setShowMakeAppointment(true);
  }

  function handleToggleWalkIn() {
    if (showWalkIn && !showBookedCheckout) {
      toast.error(
        resolveLabel(
          {
            zh: "至少需要保留一种开单方式（散客直接开单 或 预约顾客结账）",
            en: "At least one checkout mode must be enabled (Walk-in or Booked).",
          },
          langMode
        )
      );
      return;
    }
    setShowWalkIn(!showWalkIn);
  }

  function handleToggleBookedCheckout() {
    if (showBookedCheckout && !showWalkIn) {
      toast.error(
        resolveLabel(
          {
            zh: "至少需要保留一种开单方式（散客直接开单 或 预约顾客结账）",
            en: "At least one checkout mode must be enabled (Walk-in or Booked).",
          },
          langMode
        )
      );
      return;
    }
    setShowBookedCheckout(!showBookedCheckout);
  }

  const scoreboardToggles = [
    showTodaySales,
    showYesterdaySales,
    showMonthlySales,
    showServiceBreakdown,
    showMakeAppointment,
  ];
  const activeCount = scoreboardToggles.filter(Boolean).length;
  const totalCards = scoreboardToggles.length;
  const allHidden = activeCount === 0;
  const allShown = activeCount === totalCards;

  function handleSave() {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateDeskScoreboardSettings({
        showTodaySales,
        showYesterdaySales,
        showMonthlySales,
        showServiceBreakdown,
        showMakeAppointment,
        showWalkIn,
        showBookedCheckout,
      });

      if (res.success) {
        const newSaved = {
          showTodaySales,
          showYesterdaySales,
          showMonthlySales,
          showServiceBreakdown,
          showMakeAppointment,
          showWalkIn,
          showBookedCheckout,
        };
        setSavedSetting(newSaved);

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "desk_scoreboard_visibility",
              JSON.stringify(newSaved)
            );
          } catch {}
        }

        toast.success(
          resolveLabel(
            { zh: "前台看板显示设置已保存！", en: "Desk display settings saved successfully!" },
            langMode
          )
        );
        setErrorMessage(null);
      } else {
        const err = res.error || "Failed to save display settings.";
        toast.error(err);
        setErrorMessage(err);
      }
    });
  }

  return (
    <Card className="border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {resolveLabel(
                    { zh: "前台看板卡片显示设置", en: "Desk Sales Scoreboard Visibility" },
                    langMode
                  )}
                </CardTitle>
                {allHidden ? (
                  <Badge variant="destructive" className="text-[11px] gap-1">
                    <EyeOff className="h-3 w-3" />
                    {resolveLabel({ zh: "全部隐藏", en: "All Hidden" }, langMode)}
                  </Badge>
                ) : allShown ? (
                  <Badge variant="default" className="text-[11px] bg-emerald-600 gap-1">
                    <Eye className="h-3 w-3" />
                    {resolveLabel({ zh: "全部显示", en: "All Visible" }, langMode)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">
                    {resolveLabel(
                      {
                        zh: `${activeCount}/${totalCards} 项已显示`,
                        en: `${activeCount}/${totalCards} Cards Shown`,
                      },
                      langMode
                    )}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground pt-0.5">
                {resolveLabel(
                  {
                    zh: "控制沙龙前台页面 (/admin/desk) 上显示或隐藏的销售额统计卡片与开单入口。",
                    en: "Control which sales cards and breakdown statistics appear on the Salon Desk Hub page (/admin/desk).",
                  },
                  langMode
                )}
              </CardDescription>
            </div>
          </div>

          {/* Quick preset actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHideAll}
              disabled={isPending || allHidden}
              className="text-xs cursor-pointer h-8"
            >
              <EyeOff className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              {resolveLabel({ zh: "全部隐藏", en: "Hide All" }, langMode)}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShowAll}
              disabled={isPending || allShown}
              className="text-xs cursor-pointer h-8"
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              {resolveLabel({ zh: "全部显示", en: "Show All" }, langMode)}
            </Button>
            <Link
              href="/admin/desk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors h-8"
            >
              {resolveLabel({ zh: "前台开单", en: "Desk Hub" }, langMode)}
              <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`space-y-5 transition-all duration-300 ${hasChanges ? "pb-24 sm:pb-28" : "pb-6"}`}>
        {/* All Hidden Alert Notice */}
        {allHidden && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">
                {resolveLabel({ zh: "隐私保护模式已激活", en: "Privacy Mode Active" }, langMode)}
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-[11px] pt-0.5">
                {resolveLabel(
                  {
                    zh: "前台开单大屏将隐藏所有销售额与明细卡片，仅保留快捷操作与预约清单，防止到店顾客窥视营业收入。",
                    en: "All sales revenue figures and service breakdown cards will be completely removed from the Salon Desk Hub page. Staff will only see the main action buttons and appointments checklist.",
                  },
                  langMode
                )}
              </p>
            </div>
          </div>
        )}

        {/* 5 Interactive Scoreboard Toggle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Toggle 1: Today's Sales */}
          <div
            onClick={() => setShowTodaySales(!showTodaySales)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              showTodaySales
                ? "border-emerald-500/60 bg-emerald-500/5 shadow-xs"
                : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  showTodaySales
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {resolveLabel({ zh: "今日营业额卡片", en: "Today's Sales Card" }, langMode)}
                  </span>
                  {langMode !== "ONLY_ZH" && langMode !== "ONLY_EN" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      今日营业额
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {resolveLabel(
                    {
                      zh: "实时统计今日营业总额、已完成服务人次与待服务预约数。",
                      en: "Live revenue, completed client counter, and waiting bookings count for today.",
                    },
                    langMode
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showTodaySales}
              onClick={(e) => {
                e.stopPropagation();
                setShowTodaySales(!showTodaySales);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                showTodaySales ? "bg-emerald-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showTodaySales ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Yesterday's Sales */}
          <div
            onClick={() => setShowYesterdaySales(!showYesterdaySales)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              showYesterdaySales
                ? "border-amber-500/60 bg-amber-500/5 shadow-xs"
                : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  showYesterdaySales
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <History className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {resolveLabel({ zh: "昨日营业额卡片", en: "Yesterday's Sales Card" }, langMode)}
                  </span>
                  {langMode !== "ONLY_ZH" && langMode !== "ONLY_EN" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      昨日营业额
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {resolveLabel(
                    {
                      zh: "统计昨日营业总额与已服务人数，用于环比核对。",
                      en: "Yesterday's total sales revenue and completed client count for day-over-day tracking.",
                    },
                    langMode
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showYesterdaySales}
              onClick={(e) => {
                e.stopPropagation();
                setShowYesterdaySales(!showYesterdaySales);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                showYesterdaySales ? "bg-amber-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showYesterdaySales ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Monthly Sales */}
          <div
            onClick={() => setShowMonthlySales(!showMonthlySales)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              showMonthlySales
                ? "border-indigo-500/60 bg-indigo-500/5 shadow-xs"
                : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  showMonthlySales
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarRange className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {resolveLabel({ zh: "当月营业额卡片", en: "Monthly Sales Card" }, langMode)}
                  </span>
                  {langMode !== "ONLY_ZH" && langMode !== "ONLY_EN" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      当月营业额
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {resolveLabel(
                    {
                      zh: "本月累计营业额与服务人次统计。",
                      en: "Month-to-date sales total and cumulative clients served count for the current month.",
                    },
                    langMode
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showMonthlySales}
              onClick={(e) => {
                e.stopPropagation();
                setShowMonthlySales(!showMonthlySales);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                showMonthlySales ? "bg-indigo-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showMonthlySales ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: Today's Sales by Service Breakdown */}
          <div
            onClick={() => setShowServiceBreakdown(!showServiceBreakdown)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              showServiceBreakdown
                ? "border-primary/60 bg-primary/5 shadow-xs"
                : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  showServiceBreakdown
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Scissors className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {resolveLabel({ zh: "服务销售明细卡片", en: "Service Sales Breakdown" }, langMode)}
                  </span>
                  {langMode !== "ONLY_ZH" && langMode !== "ONLY_EN" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      服务销售明细
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {resolveLabel(
                    {
                      zh: "看板底部显示各项具体服务的单项开单数量与收益（如剪发 x 2，染发 x 1）。",
                      en: "Bottom card showing individual service counts and earnings (e.g. Hair Cut x 2, Coloring x 1).",
                    },
                    langMode
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showServiceBreakdown}
              onClick={(e) => {
                e.stopPropagation();
                setShowServiceBreakdown(!showServiceBreakdown);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                showServiceBreakdown ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showServiceBreakdown ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 5: Make Appointment Card */}
          <div
            onClick={() => setShowMakeAppointment(!showMakeAppointment)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              showMakeAppointment
                ? "border-sky-500/60 bg-sky-500/5 shadow-xs"
                : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  showMakeAppointment
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {resolveLabel({ zh: "预约办理入口卡片", en: "Make Appointment Card" }, langMode)}
                  </span>
                  {langMode !== "ONLY_ZH" && langMode !== "ONLY_EN" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      预约入口卡片
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {resolveLabel(
                    {
                      zh: "前台快速查看当日预约、日历看板与新建顾客预约。",
                      en: "View today's checklist & calendar, create new customer appointments.",
                    },
                    langMode
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showMakeAppointment}
              onClick={(e) => {
                e.stopPropagation();
                setShowMakeAppointment(!showMakeAppointment);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                showMakeAppointment ? "bg-sky-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showMakeAppointment ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Count Sales Section 1: Settlement Target Visibility */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {resolveLabel(
                    { zh: "收款开单对象显示设置", en: "Count Sales Target Visibility" },
                    langMode
                  )}
                </h3>
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {resolveLabel({ zh: "1. 结算对象", en: "Section 1: Targets" }, langMode)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {resolveLabel(
                  {
                    zh: "配置开单时是否显示散客直接开单、预约顾客结账或两者皆显示。",
                    en: "Toggle to show or hide either Walk-in direct billing, Booked customer checkout, or show both.",
                  },
                  langMode
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowWalkIn(true);
                  setShowBookedCheckout(true);
                }}
                className={`h-7 px-2.5 text-xs rounded-lg cursor-pointer ${
                  showWalkIn && showBookedCheckout
                    ? "bg-foreground text-background font-bold border-foreground hover:bg-foreground hover:text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {resolveLabel({ zh: "全部显示", en: "Show Both" }, langMode)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowWalkIn(true);
                  setShowBookedCheckout(false);
                }}
                className={`h-7 px-2.5 text-xs rounded-lg cursor-pointer ${
                  showWalkIn && !showBookedCheckout
                    ? "bg-foreground text-background font-bold border-foreground hover:bg-foreground hover:text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {resolveLabel({ zh: "仅散客", en: "Walk-in Only" }, langMode)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowWalkIn(false);
                  setShowBookedCheckout(true);
                }}
                className={`h-7 px-2.5 text-xs rounded-lg cursor-pointer ${
                  !showWalkIn && showBookedCheckout
                    ? "bg-foreground text-background font-bold border-foreground hover:bg-foreground hover:text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {resolveLabel({ zh: "仅预约", en: "Booked Only" }, langMode)}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Target 1: Walk-in */}
            <div
              onClick={handleToggleWalkIn}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                showWalkIn
                  ? "border-emerald-500/60 bg-emerald-500/5 shadow-xs"
                  : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    showWalkIn
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">
                      {resolveLabel({ zh: "散客直接开单", en: "Walk-in Direct Billing" }, langMode)}
                    </span>
                    {showWalkIn && !showBookedCheckout ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 px-1.5 py-0">
                        {resolveLabel({ zh: "必选", en: "Required" }, langMode)}
                      </Badge>
                    ) : showWalkIn ? (
                      <Badge variant="default" className="text-[10px] bg-emerald-600 px-1.5 py-0">
                        {resolveLabel({ zh: "显示", en: "Visible" }, langMode)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {resolveLabel({ zh: "隐藏", en: "Hidden" }, langMode)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {resolveLabel(
                      {
                        zh: "在收款开单中提供散客快速录入，无需事前预约直接结账开单。",
                        en: "Show walk-in order button in count sales for direct on-the-spot cashiering.",
                      },
                      langMode
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showWalkIn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWalkIn();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  showWalkIn ? "bg-emerald-600" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showWalkIn ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Target 2: Booked Customer Checkout */}
            <div
              onClick={handleToggleBookedCheckout}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                showBookedCheckout
                  ? "border-sky-500/60 bg-sky-500/5 shadow-xs"
                  : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    showBookedCheckout
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">
                      {resolveLabel({ zh: "预约顾客结账", en: "Booked Customer Checkout" }, langMode)}
                    </span>
                    {!showWalkIn && showBookedCheckout ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 px-1.5 py-0">
                        {resolveLabel({ zh: "必选", en: "Required" }, langMode)}
                      </Badge>
                    ) : showBookedCheckout ? (
                      <Badge variant="default" className="text-[10px] bg-sky-600 px-1.5 py-0">
                        {resolveLabel({ zh: "显示", en: "Visible" }, langMode)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {resolveLabel({ zh: "隐藏", en: "Hidden" }, langMode)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {resolveLabel(
                      {
                        zh: "在收款开单中显示今日预约列表，核对定金并结清到店预约顾客尾款。",
                        en: "Show today's scheduled appointment checklist in count sales to settle client bookings.",
                      },
                      langMode
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showBookedCheckout}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBookedCheckout();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                  showBookedCheckout ? "bg-sky-600" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showBookedCheckout ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Error message (if any) */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium text-xs sm:text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Floating Save Changes Dock */}
        <FloatingSaveBtn
          show={hasChanges}
          onSave={handleSave}
          onDiscard={handleDiscard}
          isPending={isPending}
          langMode={langMode}
        />
      </CardContent>
    </Card>
  );
}
