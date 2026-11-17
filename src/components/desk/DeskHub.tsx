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
} from "@/actions/deposit";
import { formatPrice, getServiceImage, isInternalAppMode } from "@/lib/utils";
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
import { DeskLanguageFirstTimeModal } from "./DeskLanguageFirstTimeModal";
import { DeskText } from "./DeskText";
import { RushModeControl } from "@/components/admin/RushModeControl";
import { EmergencyClosureModal } from "@/components/admin/EmergencyClosureModal";
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
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Users,
  LayoutDashboard,
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
  const [currencySymbol, setCurrencySymbol] = useState<string>("RM");
  const [languageMode, setLanguageMode] = useState<DeskLanguageMode>(
    initialSummary.deskLanguage || "ONLY_EN"
  );
  const [showFirstTimeLangModal, setShowFirstTimeLangModal] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
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

  // Collapsible toggle for Today's Service Sales Breakdown (default collapsed to avoid POS button confusion)
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState<boolean>(false);

  function toggleBreakdownExpanded() {
    setIsBreakdownExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("desk_breakdown_expanded", String(next));
        } catch {}
      }
      return next;
    });
  }

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

  // Sync state whenever initialSummary prop changes (e.g. Next.js navigation or server revalidation)
  useEffect(() => {
    let localVisibility: Record<string, boolean> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("desk_settings_visibility");
        if (raw) localVisibility = JSON.parse(raw);
      } catch {}
    }

    setSummary((prev) => ({
      ...initialSummary,
      showTodaySales: localVisibility.showTodaySales ?? (prev.showTodaySales === false ? false : initialSummary.showTodaySales),
      showYesterdaySales: localVisibility.showYesterdaySales ?? (prev.showYesterdaySales === false ? false : initialSummary.showYesterdaySales),
      showMonthlySales: localVisibility.showMonthlySales ?? (prev.showMonthlySales === false ? false : initialSummary.showMonthlySales),
      showServiceBreakdown: localVisibility.showServiceBreakdown ?? (prev.showServiceBreakdown === false ? false : initialSummary.showServiceBreakdown),
      showMakeAppointment: localVisibility.showMakeAppointment ?? (prev.showMakeAppointment === false ? false : initialSummary.showMakeAppointment),
      showWalkIn: localVisibility.showWalkIn ?? (prev.showWalkIn === false ? false : initialSummary.showWalkIn),
      showBookedCheckout: localVisibility.showBookedCheckout ?? (prev.showBookedCheckout === false ? false : initialSummary.showBookedCheckout),
    }));

    setCurrencySymbol("RM");
    try {
      localStorage.setItem("app_currency_symbol", "RM");
    } catch {}
    if (initialSummary.deskLanguage) {
      setLanguageMode(initialSummary.deskLanguage);
    }
  }, [initialSummary]);

  // Sync from localStorage on mount and revalidate on window focus
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setCurrencySymbol("RM");
        localStorage.setItem("app_currency_symbol", "RM");
        const storedLang = localStorage.getItem("app_desk_language") as DeskLanguageMode | null;
        const hasSelectedBefore = localStorage.getItem("desk_language_selected");
        if (
          storedLang &&
          ["ONLY_ZH", "ONLY_EN", "BILINGUAL_ZH_FIRST", "BILINGUAL_EN_FIRST"].includes(storedLang)
        ) {
          setLanguageMode(storedLang);
        } else if (!hasSelectedBefore) {
          setShowFirstTimeLangModal(true);
        }

        const storedToday = localStorage.getItem("desk_show_today_sales");
        if (storedToday !== null) setRevealTodaySales(storedToday === "true");

        const storedYesterday = localStorage.getItem("desk_show_yesterday_sales");
        if (storedYesterday !== null) setRevealYesterdaySales(storedYesterday === "true");

        const storedMonth = localStorage.getItem("desk_show_month_sales");
        if (storedMonth !== null) setRevealMonthSales(storedMonth === "true");

        const storedBreakdown = localStorage.getItem("desk_breakdown_expanded");
        if (storedBreakdown !== null) setIsBreakdownExpanded(storedBreakdown === "true");

        const storedVisibility = localStorage.getItem("desk_settings_visibility");
        if (storedVisibility) {
          try {
            const parsed = JSON.parse(storedVisibility);
            setSummary((prev) => ({
              ...prev,
              ...parsed,
            }));
          } catch {}
        }
      } catch {}

      const handleStorage = () => {
        setCurrencySymbol("RM");
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


  // Handle fast language switch directly from the desk header
  function handleLanguageChange(newMode: DeskLanguageMode) {
    setLanguageMode(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("app_desk_language", newMode);
        document.cookie = `app_desk_language=${newMode}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new Event("storage"));
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

  // Handle language chosen in first-time modal
  function handleFirstTimeLangSelect(newMode: DeskLanguageMode) {
    handleLanguageChange(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("desk_language_selected", "true");
      } catch {}
    }
    setShowFirstTimeLangModal(false);
  }

  // Refresh data from server
  function refreshData() {
    startTransition(async () => {
      const [sumRes, aptRes] = await Promise.all([
        getDeskDailySummary(),
        getDeskAppointments(),
      ]);
      if (sumRes.success) {
        setSummary((prev) => {
          let localVisibility: Record<string, boolean> = {};
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("desk_settings_visibility");
              if (raw) localVisibility = JSON.parse(raw);
            } catch {}
          }

          return {
            ...sumRes.data,
            // Keep user visibility settings preserved so hidden sections don't pop up after sale or network hiccups
            showTodaySales: localVisibility.showTodaySales ?? (prev.showTodaySales === false ? false : sumRes.data.showTodaySales),
            showYesterdaySales: localVisibility.showYesterdaySales ?? (prev.showYesterdaySales === false ? false : sumRes.data.showYesterdaySales),
            showMonthlySales: localVisibility.showMonthlySales ?? (prev.showMonthlySales === false ? false : sumRes.data.showMonthlySales),
            showServiceBreakdown: localVisibility.showServiceBreakdown ?? (prev.showServiceBreakdown === false ? false : sumRes.data.showServiceBreakdown),
            showMakeAppointment: localVisibility.showMakeAppointment ?? (prev.showMakeAppointment === false ? false : sumRes.data.showMakeAppointment),
            showWalkIn: localVisibility.showWalkIn ?? (prev.showWalkIn === false ? false : sumRes.data.showWalkIn),
            showBookedCheckout: localVisibility.showBookedCheckout ?? (prev.showBookedCheckout === false ? false : sumRes.data.showBookedCheckout),
          };
        });
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

  // Reusable Sales Scoreboard Content (Unified KPI Strip)
  const renderScoreboardCards = () => {
    if (totalVisibleScoreboardCards === 0) return null;

    const colsClass =
      totalVisibleScoreboardCards === 3
        ? "grid-cols-1 md:grid-cols-3"
        : totalVisibleScoreboardCards === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 max-w-md";

    return (
      <div
        className={`rounded-xl border border-border bg-card grid ${colsClass} divide-y md:divide-y-0 md:divide-x divide-border`}
      >
        {isTodayCardVisible && (
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {resolveDeskText(DESK_DICT.scoreboard.todaySales, languageMode).primary}
              </span>
              <button
                type="button"
                onClick={toggleTodaySales}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Toggle today sales"
              >
                {revealTodaySales ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-primary">
              {revealTodaySales
                ? formatPrice(summary.totalSalesCents, currencySymbol)
                : `${currencySymbol} ••••••`}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {summary.completedCount}{" "}
              {resolveDeskText(DESK_DICT.scoreboard.todayClients, languageMode).primary} ·{" "}
              {summary.pendingCount}{" "}
              {resolveDeskText(DESK_DICT.scoreboard.waiting, languageMode).primary}
            </div>
          </div>
        )}

        {isYesterdayCardVisible && (
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {resolveDeskText(DESK_DICT.scoreboard.yesterdaySales, languageMode).primary}
              </span>
              <button
                type="button"
                onClick={toggleYesterdaySales}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Toggle yesterday sales"
              >
                {revealYesterdaySales ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {revealYesterdaySales
                ? formatPrice(summary.yesterdaySalesCents || 0, currencySymbol)
                : `${currencySymbol} ••••••`}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {summary.yesterdayCompletedCount || 0}{" "}
              {resolveDeskText(DESK_DICT.scoreboard.servedBadge, languageMode).primary}
            </div>
          </div>
        )}

        {isMonthlyCardVisible && (
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {summary.monthLabel ||
                  resolveDeskText(DESK_DICT.scoreboard.monthlySales, languageMode).primary}
              </span>
              <button
                type="button"
                onClick={toggleMonthSales}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Toggle monthly sales"
              >
                {revealMonthSales ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {revealMonthSales
                ? formatPrice(summary.monthSalesCents || 0, currencySymbol)
                : `${currencySymbol} ••••••`}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {summary.monthCompletedCount || 0}{" "}
              {resolveDeskText(DESK_DICT.scoreboard.servedBadge, languageMode).primary}
            </div>
          </div>
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
      {/* Top Header Bar (POS-specific actions; navigation lives in AdminNav sidebar / mobile bottom bar) */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
            {businessName}
          </h1>
          <p className="text-xs text-muted-foreground truncate" suppressHydrationWarning>
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Monthly Financial Report (PIN-Protected) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenFinancialReport}
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline">
              {resolveDeskText(DESK_DICT.financialReport.navBtn, languageMode).primary}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={refreshData}
            disabled={isPending}
            className="h-9 w-9 rounded-lg cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin text-primary" : ""}`} />
          </Button>

          <form action={lockDeskSession}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-lg text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {resolveDeskText(DESK_DICT.header.lock, languageMode).primary}
              </span>
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop Scoreboard (Hidden on mobile or when all sales cards are hidden) */}
      {totalVisibleScoreboardCards > 0 && (
        <div className="hidden md:block">
          {renderScoreboardCards()}
        </div>
      )}

      {/* THE MAIN ACTION CARDS */}
      <div
        className={
          isMakeAppointmentVisible
            ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
            : "grid grid-cols-1 max-w-2xl mx-auto gap-4"
        }
      >
        {/* Card: Count Sales */}
        <button
          type="button"
          onClick={() => setView("COUNT_SALES")}
          className="order-1 md:order-2 group h-36 sm:h-40 p-5 sm:p-6 rounded-xl border border-primary/40 hover:border-primary bg-card hover:bg-accent/40 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {resolveDeskText(DESK_DICT.hubCards.countSalesTitle, languageMode).primary}
          </div>
        </button>

        {/* Card: Make Appointment */}
        {isMakeAppointmentVisible && (
          <button
            type="button"
            onClick={() => setView("APPOINTMENTS")}
            className="order-2 md:order-1 group h-36 sm:h-40 p-5 sm:p-6 rounded-xl border border-border bg-card hover:border-foreground/30 hover:bg-muted/30 transition-all text-left flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <CalendarDays className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {resolveDeskText(DESK_DICT.hubCards.makeAppointmentTitle, languageMode).primary}
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
                      <span className="truncate">· {summary.completedCount} {resolveDeskText(DESK_DICT.scoreboard.ordersDone, languageMode).primary}</span>
                    </>
                  ) : isYesterdayCardVisible ? (
                    <>
                      <DeskText text={DESK_DICT.scoreboard.yesterdaySales} mode={languageMode} layout="inline" />
                      <span className="truncate">· {summary.yesterdayCompletedCount || 0} {resolveDeskText(DESK_DICT.scoreboard.ordersDone, languageMode).primary}</span>
                    </>
                  ) : (
                    <>
                      <DeskText text={DESK_DICT.scoreboard.monthlySales} mode={languageMode} layout="inline" />
                      <span className="truncate">· {summary.monthCompletedCount || 0} {resolveDeskText(DESK_DICT.scoreboard.ordersDone, languageMode).primary}</span>
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
              <span>{resolveDeskText(DESK_DICT.scoreboard.scoreboardTitle, languageMode).primary}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </div>
      )}

      {/* TODAY'S SERVICE SALES BREAKDOWN (Collapsible Accordion: Collapsed by default to prevent POS confusion) */}
      {isServiceBreakdownVisible && (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
          {/* Clickable Header / Toggle Bar */}
          <button
            type="button"
            onClick={toggleBreakdownExpanded}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-muted/80 text-foreground flex items-center justify-center shrink-0 border border-border/50 shadow-xs">
                <Scissors className="h-5 w-5 text-foreground" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-foreground">
                    {resolveDeskText(DESK_DICT.breakdown.title, languageMode).primary}
                  </span>
                  {summary.servicesBreakdown.length > 0 && (
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/50 border-border/60">
                      {summary.servicesBreakdown.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Summary Numbers & Chevron Button */}
            <div className="flex items-center gap-3 shrink-0">
              {summary.servicesBreakdown.length > 0 && !isBreakdownExpanded && (
                <div className="hidden sm:flex items-center gap-2.5 pr-1 font-mono text-xs text-muted-foreground">
                  <span className="font-semibold">
                    {summary.servicesBreakdown.reduce((acc, it) => acc + it.count, 0)}{" "}
                    {resolveDeskText(DESK_DICT.breakdown.clientsUnit, languageMode).primary}
                  </span>
                  <span>•</span>
                  <span className="font-bold text-foreground">
                    {formatPrice(
                      summary.servicesBreakdown.reduce((acc, it) => acc + it.totalCents, 0),
                      currencySymbol
                    )}
                  </span>
                </div>
              )}

              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-border/70 bg-muted/50 text-foreground hover:bg-muted transition-colors shadow-2xs">
                <span>
                  {resolveDeskText(
                    isBreakdownExpanded ? DESK_DICT.breakdown.collapseBtn : DESK_DICT.breakdown.expandBtn,
                    languageMode
                  ).primary}
                </span>
                {isBreakdownExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            </div>
          </button>

          {/* Collapsible Content Body */}
          {isBreakdownExpanded && (
            <div className="border-t border-border/60 p-4 sm:p-5 pt-4 space-y-4 animate-in fade-in-50 duration-200">
              {/* Quick totals bar inside expanded view */}
              {summary.servicesBreakdown.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
                  <span className="font-semibold">
                    {summary.servicesBreakdown.reduce((acc, it) => acc + it.count, 0)}{" "}
                    {resolveDeskText(DESK_DICT.breakdown.clientsUnit, languageMode).primary}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {resolveDeskText(DESK_DICT.breakdown.totalLabel, languageMode).primary}:{" "}
                    {formatPrice(
                      summary.servicesBreakdown.reduce((acc, it) => acc + it.totalCents, 0),
                      currencySymbol
                    )}
                  </span>
                </div>
              )}

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
              {/* Admin Dashboard Link */}
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="w-full h-11 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-semibold text-sm flex items-center justify-between cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <span>{languageMode === "ONLY_ZH" ? "管理后台" : "Admin Dashboard"}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              {/* Members Link */}
              <Link href="/admin/members" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="w-full h-11 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-semibold text-sm flex items-center justify-between cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{languageMode === "ONLY_ZH" ? "会员与配套" : "Members & Promos"}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

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

              {/* Emergency Closure Action in Mobile Drawer */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsEmergencyModalOpen(true);
                }}
                className="w-full h-12 px-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-sm flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    {languageMode === "ONLY_ZH" ? "突发闭店 / 批量改约" : "Emergency Closure / Reschedule"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600" />
              </button>

              <Separator className="my-2" />

              {/* Currency Display */}
              <div className="w-full h-12 px-3.5 rounded-xl border border-border/80 bg-muted/30 font-bold text-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇲🇾</span>
                  <span className="text-xs text-muted-foreground">
                    {resolveDeskText(DESK_DICT.header.currency, languageMode).primary}
                  </span>
                </div>
                <span className="font-mono font-bold text-xs text-foreground bg-background border px-2 py-0.5 rounded-md">
                  RM (MYR)
                </span>
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="pt-1">
                <div className="text-xs font-bold text-muted-foreground mb-1.5 px-1">
                  {resolveDeskText(DESK_DICT.header.languageMode, languageMode).primary}
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
                <span>{resolveDeskText(DESK_DICT.header.refreshDeskData, languageMode).primary}</span>
              </button>

              {/* Settings Link */}
              <Link href="/admin/settings" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="w-full h-11 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>{resolveDeskText(DESK_DICT.header.adminSettings, languageMode).primary}</span>
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
                DESK_DICT.scoreboard.scoreboardSub,
                languageMode
              ).primary}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3.5">
            {renderScoreboardCards()}
          </div>
        </SheetContent>
      </Sheet>

      {/* First-time visitor language selection popup */}
      <DeskLanguageFirstTimeModal
        open={showFirstTimeLangModal}
        currentMode={languageMode}
        onSelect={handleFirstTimeLangSelect}
      />

      {/* Emergency Closure & Mass Reschedule Modal */}
      <EmergencyClosureModal
        isOpen={isEmergencyModalOpen}
        onClose={() => {
          setIsEmergencyModalOpen(false);
          refreshData();
        }}
        langMode={languageMode}
        currencySymbol={currencySymbol}
      />
    </div>
    </>
  );
}
