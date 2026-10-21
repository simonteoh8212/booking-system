"use client";

import { useState, useTransition, useEffect } from "react";
import toast from "react-hot-toast";
import { lockDeskSession } from "@/actions/auth";
import {
  getDeskDailySummary,
  getDeskAppointments,
  type DeskDailySummary,
  type DeskAppointmentItem,
} from "@/actions/desk";
import {
  updateDeskLanguageSetting,
  updateDeskCurrencySetting,
} from "@/actions/deposit";
import { formatPrice, getServiceImage } from "@/lib/utils";
import Image from "next/image";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceDto, DeskLanguageMode } from "@/types";
import { DeskAppointmentsView } from "./DeskAppointmentsView";
import { DeskCountSalesView, type DeskSaleSuccessData } from "./DeskCountSalesView";
import { DeskFinancialReportView } from "./DeskFinancialReportView";
import { AnimatedServiceCountBadge } from "./AnimatedServiceCountBadge";
import { DeskPinUnlockDialog } from "./DeskPinUnlockDialog";
import { DeskLanguageSwitcher } from "./DeskLanguageSwitcher";
import { DeskText } from "./DeskText";
import {
  DESK_DICT,
  resolveServiceName,
  resolveDeskText,
} from "@/lib/desk-i18n";
import {
  CalendarDays,
  Receipt,
  Lock,
  ArrowRight,
  TrendingUp,
  Scissors,
  RefreshCw,
  Settings,
  History,
  CalendarRange,
  Eye,
  EyeOff,
  BarChart3,
  Menu,
  ChevronRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";

interface DeskHubProps {
  initialSummary: DeskDailySummary;
  initialAppointments: DeskAppointmentItem[];
  services: ServiceDto[];
  businessName?: string;
}

export function DeskHub({
  initialSummary,
  initialAppointments,
  services,
  businessName = "Salon Desk",
}: DeskHubProps) {
  const [view, setView] = useState<"HUB" | "APPOINTMENTS" | "COUNT_SALES" | "FINANCIAL_REPORT">("HUB");
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [summary, setSummary] = useState<DeskDailySummary>(initialSummary);
  const [appointments, setAppointments] = useState<DeskAppointmentItem[]>(initialAppointments);
  const [preSelectedAppointmentId, setPreSelectedAppointmentId] = useState<string>("");
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    initialSummary.currencySymbol || "RM"
  );
  const [languageMode, setLanguageMode] = useState<DeskLanguageMode>(
    initialSummary.deskLanguage || "BILINGUAL_ZH_FIRST"
  );
  // Backend visibility flags controlled in Admin Settings
  const isTodayCardVisible = summary.showTodaySales !== false;
  const isYesterdayCardVisible = summary.showYesterdaySales !== false;
  const isMonthlyCardVisible = summary.showMonthlySales !== false;
  const isServiceBreakdownVisible = summary.showServiceBreakdown !== false;
  const isMakeAppointmentVisible = summary.showMakeAppointment !== false;

  const totalVisibleScoreboardCards =
    (isTodayCardVisible ? 1 : 0) +
    (isYesterdayCardVisible ? 1 : 0) +
    (isMonthlyCardVisible ? 1 : 0);

  // Local eye toggle (masks amounts with RM ••••••)
  const [revealTodaySales, setRevealTodaySales] = useState(true);
  const [revealYesterdaySales, setRevealYesterdaySales] = useState(true);
  const [revealMonthSales, setRevealMonthSales] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSalesOpen, setIsMobileSalesOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Track active service count increment animations locked to initial & target counts
  const [activeAnimations, setActiveAnimations] = useState<
    Record<
      string,
      {
        initialCount: number;
        targetCount: number;
        key: number;
      }
    >
  >({});
  const [highlightedServiceIds, setHighlightedServiceIds] = useState<string[]>([]);

  // Sync state whenever initialSummary prop changes (e.g. Next.js navigation)
  useEffect(() => {
    setSummary(initialSummary);
    if (initialSummary.currencySymbol) {
      setCurrencySymbol(initialSummary.currencySymbol);
      try {
        localStorage.setItem("app_currency_symbol", initialSummary.currencySymbol);
      } catch {}
    }
    if (initialSummary.deskLanguage) {
      setLanguageMode(initialSummary.deskLanguage);
    }
  }, [initialSummary]);

  // Sync from localStorage on mount and revalidate on window focus
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedSymbol = localStorage.getItem("app_currency_symbol");
        if (storedSymbol === "$" || storedSymbol === "RM") {
          setCurrencySymbol(storedSymbol);
        }
        const storedLang = localStorage.getItem("app_desk_language") as DeskLanguageMode | null;
        if (
          storedLang &&
          ["ONLY_ZH", "ONLY_EN", "BILINGUAL_ZH_FIRST", "BILINGUAL_EN_FIRST"].includes(storedLang)
        ) {
          setLanguageMode(storedLang);
        }

        const storedToday = localStorage.getItem("desk_show_today_sales");
        if (storedToday !== null) setRevealTodaySales(storedToday === "true");

        const storedYesterday = localStorage.getItem("desk_show_yesterday_sales");
        if (storedYesterday !== null) setRevealYesterdaySales(storedYesterday === "true");

        const storedMonth = localStorage.getItem("desk_show_month_sales");
        if (storedMonth !== null) setRevealMonthSales(storedMonth === "true");
      } catch {}

      const handleStorage = () => {
        const updated = localStorage.getItem("app_currency_symbol");
        if (updated === "$" || updated === "RM") setCurrencySymbol(updated);
      };
      const handleFocus = () => refreshData();

      window.addEventListener("storage", handleStorage);
      window.addEventListener("focus", handleFocus);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, []);

  function toggleTodaySales() {
    setRevealTodaySales((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desk_show_today_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleYesterdaySales() {
    setRevealYesterdaySales((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desk_show_yesterday_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleMonthSales() {
    setRevealMonthSales((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desk_show_month_sales", String(next));
      } catch {}
      return next;
    });
  }

  // Handle fast currency toggle directly from desk header
  function handleCurrencyToggle() {
    const nextSymbol = currencySymbol === "$" ? "RM" : "$";
    const nextCurr = nextSymbol === "$" ? "AUD" : "MYR";
    setCurrencySymbol(nextSymbol);
    setSummary((prev) => ({ ...prev, currency: nextCurr, currencySymbol: nextSymbol }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("app_currency_symbol", nextSymbol);
      } catch {}
    }
    startTransition(async () => {
      await updateDeskCurrencySetting(nextCurr, nextSymbol);
    });
  }

  // Handle fast language switch directly from the desk header
  function handleLanguageChange(newMode: DeskLanguageMode) {
    setLanguageMode(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("app_desk_language", newMode);
      } catch {}
    }
    startTransition(async () => {
      const res = await updateDeskLanguageSetting(newMode);
      if (res.success) {
        toast.success(
          newMode === "ONLY_ZH"
            ? "语言已切换为：纯中文"
            : newMode === "ONLY_EN"
            ? "Language switched to: English"
            : "语言已切换为：中英双语"
        );
      }
    });
  }

  // Refresh data from server
  function refreshData() {
    startTransition(async () => {
      const [sumRes, aptRes] = await Promise.all([
        getDeskDailySummary(),
        getDeskAppointments(),
      ]);
      if (sumRes.success) {
        setSummary(sumRes.data);
        if (sumRes.data.currencySymbol) {
          setCurrencySymbol(sumRes.data.currencySymbol);
          try {
            localStorage.setItem("app_currency_symbol", sumRes.data.currencySymbol);
          } catch {}
        }
        if (sumRes.data.deskLanguage) setLanguageMode(sumRes.data.deskLanguage);
      }
      if (aptRes.success) setAppointments(aptRes.data);
    });
  }

  // Handle successful sale finalization with synchronized animation and toast
  function handleSaleSuccess(saleData?: DeskSaleSuccessData) {
    setPreSelectedAppointmentId("");

    if (saleData && saleData.serviceIds.length > 0) {
      // Calculate occurrences of each service in this sale
      const serviceOccurrences: Record<string, number> = {};
      saleData.serviceIds.forEach((id) => {
        serviceOccurrences[id] = (serviceOccurrences[id] || 0) + 1;
      });

      // Snapshot current counts directly from summary breakdown
      const breakdownMap = new Map(summary.servicesBreakdown.map((s) => [s.serviceId, s.count]));
      const newAnimations: Record<
        string,
        { initialCount: number; targetCount: number; key: number }
      > = {};
      const animKey = Date.now();

      saleData.serviceIds.forEach((id) => {
        const initialCount = breakdownMap.get(id) ?? 0;
        const inc = serviceOccurrences[id] || 1;
        newAnimations[id] = {
          initialCount,
          targetCount: initialCount + inc,
          key: animKey,
        };
      });

      // Optimistically ensure newly sold services exist in summary.servicesBreakdown
      // so if a service had 0 sales today, its card appears immediately and animates 0 -> 1
      setSummary((prevSummary) => {
        const existingIds = new Set(prevSummary.servicesBreakdown.map((s) => s.serviceId));
        const updatedBreakdown = [...prevSummary.servicesBreakdown];

        saleData.serviceIds.forEach((id) => {
          if (!existingIds.has(id)) {
            const svcMeta = services.find((s) => s.id === id);
            if (svcMeta) {
              existingIds.add(id);
              updatedBreakdown.push({
                serviceId: id,
                serviceName: svcMeta.name,
                category: svcMeta.category || null,
                count: 0,
                totalCents: 0,
              });
            }
          }
        });

        return {
          ...prevSummary,
          servicesBreakdown: updatedBreakdown,
        };
      });

      setActiveAnimations(newAnimations);
      setHighlightedServiceIds(saleData.serviceIds);

      // Auto clear animation lock after 4.5s so card settles smoothly on server state
      setTimeout(() => {
        setActiveAnimations({});
        setHighlightedServiceIds([]);
      }, 4500);

      // Toast notification on top
      const serviceNamesStr = saleData.serviceNames.join(", ");
      const formattedTotal = formatPrice(saleData.totalCents, currencySymbol);
      toast.success(
        languageMode === "ONLY_ZH"
          ? `开单结账成功！${serviceNamesStr ? `(${serviceNamesStr})` : ""} +${formattedTotal}`
          : languageMode === "ONLY_EN"
          ? `Sale recorded! ${serviceNamesStr ? `(${serviceNamesStr})` : ""} +${formattedTotal}`
          : `开单结账成功！Sale recorded! ${serviceNamesStr ? `(${serviceNamesStr})` : ""} +${formattedTotal}`,
        {
          duration: 4500,
          icon: "🎉",
        }
      );
    }

    // Delay background data refresh to 1200ms so the badge peak and number reel glide
    // finish completely and settle before background data sync
    setTimeout(() => {
      refreshData();
    }, 1200);

    setView("HUB");
  }

  // Handle direct checkout from checklist item
  function handleRingUpFromAppointment(aptId: string) {
    setPreSelectedAppointmentId(aptId);
    setView("COUNT_SALES");
  }

  // Open Financial Report (with PIN check)
  function handleOpenFinancialReport() {
    const isUnlocked =
      typeof window !== "undefined" &&
      sessionStorage.getItem("desk_finance_unlocked") === "true";

    if (isUnlocked) {
      setView("FINANCIAL_REPORT");
    } else {
      setIsPinDialogOpen(true);
    }
  }

  // Reusable Sales Scoreboard Content
  const renderScoreboardCards = () => {
    if (totalVisibleScoreboardCards === 0) return null;

    const gridColsClass =
      totalVisibleScoreboardCards === 3
        ? "grid-cols-1 md:grid-cols-3"
        : totalVisibleScoreboardCards === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 max-w-md";

    return (
      <div className={`grid ${gridColsClass} gap-3.5`}>
        {/* Card 1: Today's Sales */}
        {isTodayCardVisible && (
          <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <DeskText
                    text={DESK_DICT.scoreboard.todaySales}
                    mode={languageMode}
                    layout="inline"
                    primaryClass="font-bold text-xs text-foreground tracking-tight"
                  />
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                  <DeskText
                    text={DESK_DICT.scoreboard.todayClients}
                    mode={languageMode}
                    layout="badge"
                  />
                  : {summary.completedCount}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                  {revealTodaySales
                    ? formatPrice(summary.totalSalesCents, currencySymbol)
                    : `${currencySymbol} ••••••`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleTodaySales}
                  className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={revealTodaySales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                  aria-label={revealTodaySales ? "Hide today sales" : "Show today sales"}
                >
                  {revealTodaySales ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <DeskText
                  text={DESK_DICT.scoreboard.waiting}
                  mode={languageMode}
                  layout="badge"
                />
              </span>
              <span className="font-bold font-mono text-foreground">
                {summary.pendingCount}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {resolveDeskText(DESK_DICT.scoreboard.bookedBadge, languageMode).primary}
                </span>
              </span>
            </div>
          </Card>
        )}

        {/* Card 2: Yesterday's Sales */}
        {isYesterdayCardVisible && (
          <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <History className="h-4 w-4" />
                  </div>
                  <DeskText
                    text={DESK_DICT.scoreboard.yesterdaySales}
                    mode={languageMode}
                    layout="inline"
                    primaryClass="font-bold text-xs text-foreground tracking-tight"
                  />
                </div>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                  <DeskText
                    text={DESK_DICT.scoreboard.yesterdayClients}
                    mode={languageMode}
                    layout="badge"
                  />
                  : {summary.yesterdayCompletedCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                  {revealYesterdaySales
                    ? formatPrice(summary.yesterdaySalesCents || 0, currencySymbol)
                    : `${currencySymbol} ••••••`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleYesterdaySales}
                  className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={revealYesterdaySales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                  aria-label={revealYesterdaySales ? "Hide yesterday sales" : "Show yesterday sales"}
                >
                  {revealYesterdaySales ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <DeskText
                  text={DESK_DICT.scoreboard.completedClients}
                  mode={languageMode}
                  layout="badge"
                />
              </span>
              <span className="font-bold font-mono text-foreground">
                {summary.yesterdayCompletedCount || 0}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {resolveDeskText(DESK_DICT.scoreboard.servedBadge, languageMode).primary}
                </span>
              </span>
            </div>
          </Card>
        )}

        {/* Card 3: Monthly Sales */}
        {isMonthlyCardVisible && (
          <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                  <DeskText
                    text={DESK_DICT.scoreboard.monthlySales}
                    mode={languageMode}
                    layout="inline"
                    primaryClass="font-bold text-xs text-foreground tracking-tight"
                  />
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                  {summary.monthLabel || "This Month"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                  {revealMonthSales
                    ? formatPrice(summary.monthSalesCents || 0, currencySymbol)
                    : `${currencySymbol} ••••••`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleMonthSales}
                  className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={revealMonthSales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                  aria-label={revealMonthSales ? "Hide monthly sales" : "Show monthly sales"}
                >
                  {revealMonthSales ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <DeskText
                  text={DESK_DICT.scoreboard.monthlyClients}
                  mode={languageMode}
                  layout="badge"
                />
              </span>
              <span className="font-bold font-mono text-foreground">
                {summary.monthCompletedCount || 0}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {resolveDeskText(DESK_DICT.scoreboard.servedBadge, languageMode).primary}
                </span>
              </span>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // MAIN DESK HUB SCREEN
  return (
    <>
      {/* Sub-view: "Financial Report" */}
      {view === "FINANCIAL_REPORT" && (
        <DeskFinancialReportView
          currencySymbol={currencySymbol}
          languageMode={languageMode}
          onBack={() => setView("HUB")}
        />
      )}

      {/* Sub-view: "Make Appointment" */}
      {view === "APPOINTMENTS" && (
        <DeskAppointmentsView
          appointments={appointments}
          services={services}
          currencySymbol={currencySymbol}
          languageMode={languageMode}
          onBack={() => setView("HUB")}
          onRingUpAppointment={handleRingUpFromAppointment}
          onRefresh={refreshData}
        />
      )}

      {/* Sub-view: "Count Sales" */}
      {view === "COUNT_SALES" && (
        <DeskCountSalesView
          services={services}
          todayAppointments={appointments}
          initialAppointmentId={preSelectedAppointmentId}
          currencySymbol={currencySymbol}
          languageMode={languageMode}
          showWalkIn={summary.showWalkIn !== false}
          showBookedCheckout={summary.showBookedCheckout !== false}
          onBack={() => {
            setPreSelectedAppointmentId("");
            setView("HUB");
          }}
          onSuccess={handleSaleSuccess}
        />
      )}

      <div
        className={
          view === "HUB"
            ? "space-y-5 pb-12 max-w-4xl mx-auto select-none"
            : "hidden"
        }
      >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
              {businessName}
            </span>
            <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary shrink-0">
              <DeskText
                text={DESK_DICT.header.deskMode}
                mode={languageMode}
                layout="badge"
              />
            </Badge>
          </div>
          <p className="text-xs sm:text-base font-bold text-muted-foreground truncate">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>

        {/* Desktop Action Icons (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Quick Monthly Financial & Profit Report Button (PIN-Protected) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenFinancialReport}
            className="h-12 px-3.5 rounded-2xl flex items-center gap-1.5 font-bold hover:bg-muted text-sm shadow-xs border-2 cursor-pointer"
            title="Monthly Financial & Profit Report / 查看月度财报与净利润"
          >
            <BarChart3 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <DeskText
              text={DESK_DICT.financialReport.navBtn}
              mode={languageMode}
              layout="badge"
              primaryClass="font-bold text-xs"
            />
          </Button>

          {/* Quick Currency Toggle Pill */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCurrencyToggle}
            disabled={isPending}
            className="h-12 px-3.5 rounded-2xl flex items-center gap-1.5 font-bold hover:bg-muted text-sm shadow-xs border-2 cursor-pointer"
            title="Switch Currency (AUD $ / MYR RM) / 切换货币"
          >
            <span suppressHydrationWarning className="text-base">{currencySymbol === "$" ? "🇦🇺" : "🇲🇾"}</span>
            <span suppressHydrationWarning className="font-mono text-foreground">{currencySymbol}</span>
          </Button>

          {/* Quick Language Switcher Dropdown */}
          <DeskLanguageSwitcher
            currentMode={languageMode}
            onLanguageChange={handleLanguageChange}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isPending}
            className="h-12 w-12 rounded-2xl p-0 hover:bg-muted"
            title="Refresh Data / 刷新"
          >
            <RefreshCw className={`h-5 w-5 ${isPending ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Link href="/admin/settings">
            <Button
              variant="outline"
              size="sm"
              className="h-12 w-12 rounded-2xl p-0 hover:bg-muted"
              title="Full Admin Settings / 系统设置"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>

          <form action={lockDeskSession}>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="h-12 px-4 rounded-2xl text-sm font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <DeskText
                text={DESK_DICT.header.lock}
                mode={languageMode}
                layout="badge"
                primaryClass="font-bold"
              />
            </Button>
          </form>
        </div>

        {/* Mobile: Classic Hamburger Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
            className="h-11 w-11 p-0 rounded-2xl border-2 border-border/80 hover:bg-muted text-foreground cursor-pointer shadow-xs flex items-center justify-center shrink-0"
            aria-label="Open Desk Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Scoreboard (Hidden on mobile or when all sales cards are hidden) */}
      {totalVisibleScoreboardCards > 0 && (
        <div className="hidden md:block">
          {renderScoreboardCards()}
        </div>
      )}

      {/* THE MAIN ACTION CARDS - Clean Tactile Retail POS Style */}
      {/* On mobile: Count Sales is ordered first for immediate 1-tap recording without scrolling */}
      <div
        className={
          isMakeAppointmentVisible
            ? "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
            : "grid grid-cols-1 max-w-2xl mx-auto gap-4 sm:gap-5"
        }
      >
        {/* Card: Count Sales (Clean Card with Explicit Solid Action Pill - Option 2) */}
        <button
          type="button"
          onClick={() => setView("COUNT_SALES")}
          className="order-1 md:order-2 group relative h-40 sm:h-48 p-5 sm:p-6 rounded-3xl border-2 border-emerald-600/40 hover:border-emerald-600 bg-card hover:bg-muted/30 shadow-xs hover:shadow-md active:scale-[0.99] transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center border border-emerald-600/20 shadow-xs group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Receipt className="h-6 sm:h-7 w-6 sm:w-7" />
            </div>
            {/* High-contrast solid emerald action pill */}
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-xs group-hover:bg-emerald-700 transition-all">
              <span>{resolveDeskText({ zh: "立即开单", en: "Start Sale" }, languageMode).primary}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div className="space-y-1">
            <DeskText
              text={DESK_DICT.hubCards.countSalesTitle}
              mode={languageMode}
              layout="stack"
              primaryClass="text-2xl sm:text-3xl font-black text-foreground tracking-tight"
              secondaryClass="text-sm font-semibold text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground font-normal pt-0.5 line-clamp-1 sm:line-clamp-none">
              {resolveDeskText(DESK_DICT.hubCards.countSalesSub, languageMode).primary}
            </p>
          </div>
        </button>

        {/* Card: Make Appointment (Conditionally displayed) */}
        {isMakeAppointmentVisible && (
          <button
            type="button"
            onClick={() => setView("APPOINTMENTS")}
            className="order-2 md:order-1 group relative h-40 sm:h-48 p-5 sm:p-6 rounded-3xl border-2 border-border/80 bg-card hover:border-foreground/30 shadow-xs hover:shadow-md active:scale-[0.99] transition-all text-left flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-muted/80 text-foreground flex items-center justify-center border border-border/50 group-hover:bg-foreground group-hover:text-background transition-all shadow-xs">
                <CalendarDays className="h-6 sm:h-7 w-6 sm:w-7" />
              </div>
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted text-foreground text-xs sm:text-sm font-bold border border-border/60 group-hover:bg-foreground group-hover:text-background transition-all shadow-xs">
                <span>{resolveDeskText({ zh: "预约管理", en: "Appointments" }, languageMode).primary}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            <div className="space-y-1">
              <DeskText
                text={DESK_DICT.hubCards.makeAppointmentTitle}
                mode={languageMode}
                layout="stack"
                primaryClass="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight"
                secondaryClass="text-sm font-semibold text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground/80 font-normal pt-0.5 line-clamp-1 sm:line-clamp-none">
                {resolveDeskText(DESK_DICT.hubCards.makeAppointmentSub, languageMode).primary}
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Mobile-Only: Quick Compact Scoreboard Pill */}
      {totalVisibleScoreboardCards > 0 && (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSalesOpen(true)}
            className="w-full p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isTodayCardVisible
                    ? "bg-emerald-500/10 text-emerald-600"
                    : isYesterdayCardVisible
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-indigo-500/10 text-indigo-600"
                }`}
              >
                {isTodayCardVisible ? (
                  <TrendingUp className="h-5 w-5" />
                ) : isYesterdayCardVisible ? (
                  <History className="h-5 w-5" />
                ) : (
                  <CalendarRange className="h-5 w-5" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  {isTodayCardVisible ? (
                    <>
                      <DeskText text={DESK_DICT.scoreboard.todaySales} mode={languageMode} layout="inline" />
                      <span className="truncate">· {summary.completedCount} {resolveDeskText({ zh: "单完成", en: "orders" }, languageMode).primary}</span>
                    </>
                  ) : isYesterdayCardVisible ? (
                    <>
                      <DeskText text={DESK_DICT.scoreboard.yesterdaySales} mode={languageMode} layout="inline" />
                      <span className="truncate">· {summary.yesterdayCompletedCount || 0} {resolveDeskText({ zh: "单完成", en: "orders" }, languageMode).primary}</span>
                    </>
                  ) : (
                    <>
                      <DeskText text={DESK_DICT.scoreboard.monthlySales} mode={languageMode} layout="inline" />
                      <span className="truncate">· {summary.monthCompletedCount || 0} {resolveDeskText({ zh: "单完成", en: "orders" }, languageMode).primary}</span>
                    </>
                  )}
                </div>
                <div className="font-mono font-black text-xl text-foreground leading-tight tracking-tight">
                  {isTodayCardVisible
                    ? (revealTodaySales ? formatPrice(summary.totalSalesCents, currencySymbol) : `${currencySymbol} ••••••`)
                    : isYesterdayCardVisible
                    ? (revealYesterdaySales ? formatPrice(summary.yesterdaySalesCents || 0, currencySymbol) : `${currencySymbol} ••••••`)
                    : (revealMonthSales ? formatPrice(summary.monthSalesCents || 0, currencySymbol) : `${currencySymbol} ••••••`)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted px-3 py-2 rounded-xl shrink-0">
              <span>{resolveDeskText({ zh: "营业看板", en: "Scoreboard" }, languageMode).primary}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </div>
      )}

      {/* TODAY'S SERVICE SALES BREAKDOWN (how many hair cuts, hair color dye, etc.) */}
      {isServiceBreakdownVisible && (
        <Card className="border-2 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <DeskText
                text={DESK_DICT.breakdown.title}
                mode={languageMode}
                layout="inline"
                primaryClass="text-lg sm:text-xl font-extrabold text-foreground"
              />
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">
              {summary.servicesBreakdown.length}{" "}
              <DeskText
                text={DESK_DICT.breakdown.servicesDoneBadge}
                mode={languageMode}
                layout="badge"
                primaryClass="font-medium ml-1"
              />
            </Badge>
          </div>
          <Separator />

          {summary.servicesBreakdown.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground space-y-1">
              <p className="text-base font-semibold">
                <DeskText
                  text={DESK_DICT.breakdown.noSalesYet}
                  mode={languageMode}
                  layout="inline"
                />
              </p>
              <p className="text-xs">
                <DeskText
                  text={DESK_DICT.breakdown.tapCountNotice}
                  mode={languageMode}
                  layout="inline"
                />
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {summary.servicesBreakdown.map((item) => {
                const svcNameResolved = resolveServiceName(item.serviceName, languageMode);
                const anim = activeAnimations[item.serviceId];
                const isJustIncremented = highlightedServiceIds.includes(item.serviceId);
                const initialCount = anim ? anim.initialCount : item.count;
                const targetCount = anim ? anim.targetCount : item.count;
                const shouldAnimate = Boolean(anim && anim.targetCount > anim.initialCount);

                return (
                  <div
                    key={item.serviceId}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-colors duration-500 flex items-center justify-between gap-3 ${
                      isJustIncremented
                        ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                        : "border-border/80 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getServiceImage(item.serviceName) ? (
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-border/60 bg-muted/40 shadow-2xs p-1 flex items-center justify-center">
                          <Image
                            src={getServiceImage(item.serviceName)!}
                            alt={item.serviceName}
                            fill
                            unoptimized
                            className="object-contain drop-shadow-xs"
                            sizes="(max-width: 640px) 56px, 64px"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Scissors className="h-6 sm:h-7 w-6 sm:w-7" />
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <DeskText
                          zh={svcNameResolved.primary}
                          en={svcNameResolved.secondary}
                          mode={languageMode}
                          primaryClass="font-bold text-base sm:text-lg text-foreground leading-tight truncate"
                          secondaryClass="text-xs text-muted-foreground font-normal"
                        />
                        <p className="text-xs text-muted-foreground font-medium truncate">
                          {item.category || "General"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <AnimatedServiceCountBadge
                        targetCount={targetCount}
                        initialCount={initialCount}
                        shouldAnimate={shouldAnimate}
                        unitText={
                          resolveDeskText(
                            targetCount === 1
                              ? DESK_DICT.breakdown.clientUnit
                              : DESK_DICT.breakdown.clientsUnit,
                            languageMode
                          ).primary
                        }
                      />
                      <p className="text-sm sm:text-base font-bold font-mono text-foreground mt-1">
                        {formatPrice(item.totalCents, currencySymbol)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
      
      {/* 4-Digit Owner PIN Unlock Modal for Financial Report */}
      <DeskPinUnlockDialog
        open={isPinDialogOpen}
        onOpenChange={setIsPinDialogOpen}
        languageMode={languageMode}
        onSuccess={() => setView("FINANCIAL_REPORT")}
      />

      {/* Mobile Drawer Navigation (Classic Hamburger Menu) */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-xs p-6 select-none flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <SheetHeader className="text-left space-y-1 pb-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-black text-foreground tracking-tight">
                  {businessName}
                </SheetTitle>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                  <DeskText text={DESK_DICT.header.deskMode} mode={languageMode} layout="badge" />
                </Badge>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, d MMM yyyy")}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-2">
              {/* Scoreboard Overview Button (Only if at least one sales card is visible) */}
              {totalVisibleScoreboardCards > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsMobileSalesOpen(true);
                  }}
                  className="w-full h-12 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-sm flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                    <DeskText
                      zh="营业额看板"
                      en="Sales Scoreboard"
                      mode={languageMode}
                      primaryClass="text-sm font-bold"
                    />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Monthly Financial Report */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenFinancialReport();
                }}
                className="w-full h-12 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-sm flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4.5 w-4.5 text-indigo-600" />
                  <DeskText
                    text={DESK_DICT.financialReport.navBtn}
                    mode={languageMode}
                    primaryClass="text-sm font-bold"
                  />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <Separator className="my-2" />

              {/* Currency Toggle */}
              <button
                type="button"
                onClick={handleCurrencyToggle}
                disabled={isPending}
                className="w-full h-12 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-sm flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span suppressHydrationWarning className="text-base">{currencySymbol === "$" ? "🇦🇺" : "🇲🇾"}</span>
                  <span className="text-xs text-muted-foreground">
                    {resolveDeskText({ zh: "结算货币", en: "Currency" }, languageMode).primary}
                  </span>
                </div>
                <span suppressHydrationWarning className="font-mono font-bold text-sm text-foreground bg-muted px-2.5 py-1 rounded-lg">
                  {currencySymbol} ({currencySymbol === "$" ? "AUD" : "MYR"})
                </span>
              </button>

              {/* Language Switcher in Mobile Drawer */}
              <div className="pt-1">
                <div className="text-xs font-bold text-muted-foreground mb-1.5 px-1">
                  {resolveDeskText({ zh: "界面语言模式", en: "Display Language" }, languageMode).primary}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "ONLY_ZH", label: "纯中文" },
                    { id: "ONLY_EN", label: "English" },
                    { id: "BILINGUAL_ZH_FIRST", label: "中/英 (双语)" },
                    { id: "BILINGUAL_EN_FIRST", label: "EN/中 (双语)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLanguageChange(item.id as DeskLanguageMode)}
                      className={`h-9 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        languageMode === item.id
                          ? "bg-foreground text-background border-foreground shadow-xs"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              {/* Refresh Data */}
              <button
                type="button"
                onClick={() => {
                  refreshData();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isPending}
                className="w-full h-11 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin text-primary" : ""}`} />
                <span>{resolveDeskText({ zh: "刷新前台数据", en: "Refresh Desk Data" }, languageMode).primary}</span>
              </button>

              {/* Settings Link */}
              <Link href="/admin/settings" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="w-full h-11 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>{resolveDeskText({ zh: "系统管理设置", en: "Admin Settings" }, languageMode).primary}</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Drawer Footer: Lock Screen */}
          <div className="pt-4 border-t mt-4">
            <form action={lockDeskSession}>
              <Button
                type="submit"
                variant="destructive"
                className="w-full h-12 rounded-xl text-sm font-bold gap-2 cursor-pointer shadow-xs"
              >
                <Lock className="h-4 w-4" />
                <DeskText
                  text={DESK_DICT.header.lock}
                  mode={languageMode}
                  layout="badge"
                  primaryClass="font-bold"
                />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Sales Scoreboard Sheet (Opened on demand without cluttering home view) */}
      <Sheet open={isMobileSalesOpen} onOpenChange={setIsMobileSalesOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto p-5 sm:p-6 rounded-t-3xl select-none">
          <SheetHeader className="text-left pb-3 border-b space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <DeskText
                  zh="营业额看板"
                  en="Sales Scoreboard"
                  mode={languageMode}
                  layout="inline"
                />
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {resolveDeskText(
                { zh: "今日、昨日及本月实时营业总额与完成单数", en: "Live sales revenue and completed order stats" },
                languageMode
              ).primary}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3.5">
            {renderScoreboardCards()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
}
