"use client";

import { useState, useTransition, useEffect } from "react";
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
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceDto, DeskLanguageMode } from "@/types";
import { DeskAppointmentsView } from "./DeskAppointmentsView";
import { DeskCountSalesView } from "./DeskCountSalesView";
import { DeskFinancialReportView } from "./DeskFinancialReportView";
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
} from "lucide-react";
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
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app_currency_symbol");
      if (stored === "$" || stored === "RM") return stored;
    }
    return initialSummary.currencySymbol || "RM";
  });
  const [languageMode, setLanguageMode] = useState<DeskLanguageMode>(
    initialSummary.deskLanguage || "BILINGUAL_ZH_FIRST"
  );
  const [showTodaySales, setShowTodaySales] = useState(true);
  const [showYesterdaySales, setShowYesterdaySales] = useState(true);
  const [showMonthSales, setShowMonthSales] = useState(true);
  const [isPending, startTransition] = useTransition();

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
        if (storedToday !== null) setShowTodaySales(storedToday === "true");

        const storedYesterday = localStorage.getItem("desk_show_yesterday_sales");
        if (storedYesterday !== null) setShowYesterdaySales(storedYesterday === "true");

        const storedMonth = localStorage.getItem("desk_show_month_sales");
        if (storedMonth !== null) setShowMonthSales(storedMonth === "true");
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
    setShowTodaySales((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desk_show_today_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleYesterdaySales() {
    setShowYesterdaySales((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desk_show_yesterday_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleMonthSales() {
    setShowMonthSales((prev) => {
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
      await updateDeskLanguageSetting(newMode);
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

  // Sub-view: "Financial Report"
  if (view === "FINANCIAL_REPORT") {
    return (
      <DeskFinancialReportView
        currencySymbol={currencySymbol}
        languageMode={languageMode}
        onBack={() => setView("HUB")}
      />
    );
  }

  // Sub-view: "Make Appointment"
  if (view === "APPOINTMENTS") {
    return (
      <DeskAppointmentsView
        appointments={appointments}
        services={services}
        currencySymbol={currencySymbol}
        languageMode={languageMode}
        onBack={() => setView("HUB")}
        onRingUpAppointment={handleRingUpFromAppointment}
        onRefresh={refreshData}
      />
    );
  }

  // Sub-view: "Count Sales"
  if (view === "COUNT_SALES") {
    return (
      <DeskCountSalesView
        services={services}
        todayAppointments={appointments}
        initialAppointmentId={preSelectedAppointmentId}
        currencySymbol={currencySymbol}
        languageMode={languageMode}
        onBack={() => {
          setPreSelectedAppointmentId("");
          setView("HUB");
        }}
        onSuccess={() => {
          setPreSelectedAppointmentId("");
          refreshData();
          setView("HUB");
        }}
      />
    );
  }

  // MAIN DESK HUB SCREEN
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {businessName}
            </span>
            <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary">
              <DeskText
                text={DESK_DICT.header.deskMode}
                mode={languageMode}
                layout="badge"
              />
            </Badge>
          </div>
          <p className="text-sm sm:text-base font-bold text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>

        {/* Action icons: Financial Report, Currency Switcher, Language Switcher, Settings & Lock Screen */}
        <div className="flex items-center gap-2">
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
            <span className="text-base">{currencySymbol === "$" ? "🇦🇺" : "🇲🇾"}</span>
            <span className="font-mono text-foreground">{currencySymbol}</span>
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
      </div>

      {/* 3-Card Sales Scoreboard: Direction 2 - Square / Retail POS Tactile Clean */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Today's Sales */}
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
                {showTodaySales
                  ? formatPrice(summary.totalSalesCents, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTodaySales}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showTodaySales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showTodaySales ? "Hide today sales" : "Show today sales"}
              >
                {showTodaySales ? (
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

        {/* Card 2: Yesterday's Sales */}
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
                {showYesterdaySales
                  ? formatPrice(summary.yesterdaySalesCents || 0, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleYesterdaySales}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showYesterdaySales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showYesterdaySales ? "Hide yesterday sales" : "Show yesterday sales"}
              >
                {showYesterdaySales ? (
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

        {/* Card 3: Monthly Sales */}
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
                {showMonthSales
                  ? formatPrice(summary.monthSalesCents || 0, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleMonthSales}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showMonthSales ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showMonthSales ? "Hide monthly sales" : "Show monthly sales"}
              >
                {showMonthSales ? (
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
      </div>

      {/* THE 2 MAIN ACTION CARDS - Clean Tactile Retail POS Style (Non-AI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
        {/* Card 1: Make Appointment */}
        <button
          type="button"
          onClick={() => setView("APPOINTMENTS")}
          className="group relative h-44 sm:h-48 p-6 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 shadow-xs hover:shadow-md active:scale-[0.99] transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-muted/80 text-foreground flex items-center justify-center border border-border/50 group-hover:bg-foreground group-hover:text-background transition-all shadow-xs">
              <CalendarDays className="h-7 w-7" />
            </div>
            <span className="w-9 h-9 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-foreground flex items-center justify-center group-hover:translate-x-1 transition-all">
              <ArrowRight className="h-4 w-4" />
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
            <p className="text-xs text-muted-foreground/80 font-normal pt-0.5">
              {resolveDeskText(DESK_DICT.hubCards.makeAppointmentSub, languageMode).primary}
            </p>
          </div>
        </button>

        {/* Card 2: Count Sales */}
        <button
          type="button"
          onClick={() => setView("COUNT_SALES")}
          className="group relative h-44 sm:h-48 p-6 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 shadow-xs hover:shadow-md active:scale-[0.99] transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-muted/80 text-foreground flex items-center justify-center border border-border/50 group-hover:bg-foreground group-hover:text-background transition-all shadow-xs">
              <Receipt className="h-7 w-7" />
            </div>
            <span className="w-9 h-9 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-foreground flex items-center justify-center group-hover:translate-x-1 transition-all">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-1">
            <DeskText
              text={DESK_DICT.hubCards.countSalesTitle}
              mode={languageMode}
              layout="stack"
              primaryClass="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight"
              secondaryClass="text-sm font-semibold text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground/80 font-normal pt-0.5">
              {resolveDeskText(DESK_DICT.hubCards.countSalesSub, languageMode).primary}
            </p>
          </div>
        </button>
      </div>

      {/* TODAY'S SERVICE SALES BREAKDOWN (how many hair cuts, hair color dye, etc.) */}
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
              return (
                <div
                  key={item.serviceId}
                  className="p-4 rounded-2xl border bg-muted/30 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <DeskText
                      zh={svcNameResolved.primary}
                      en={svcNameResolved.secondary}
                      mode={languageMode}
                      primaryClass="font-bold text-base sm:text-lg text-foreground leading-tight"
                      secondaryClass="text-xs text-muted-foreground font-normal"
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                      {item.category || "General"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-primary/10 text-primary font-black text-base px-2.5 py-0.5 rounded-lg font-mono">
                      {item.count}{" "}
                      <span className="text-xs font-normal">
                        {resolveDeskText(
                          item.count === 1
                            ? DESK_DICT.breakdown.clientUnit
                            : DESK_DICT.breakdown.clientsUnit,
                          languageMode
                        ).primary}
                      </span>
                    </div>
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
      
      {/* 4-Digit Owner PIN Unlock Modal for Financial Report */}
      <DeskPinUnlockDialog
        open={isPinDialogOpen}
        onOpenChange={setIsPinDialogOpen}
        languageMode={languageMode}
        onSuccess={() => setView("FINANCIAL_REPORT")}
      />
    </div>
  );
}
