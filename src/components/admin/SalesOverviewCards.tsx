"use client";

import { Button } from "@/components/ui/button";
import { formatPrice, toBusinessDateString } from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";
import type { DeskDailySummary } from "@/actions/desk";
import type { DeskLanguageMode } from "@/types";
import { Eye, EyeOff, Scissors, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { TodaySalesDetailsDialog } from "@/components/admin/TodaySalesDetailsDialog";

interface SalesOverviewCardsProps {
  summary: DeskDailySummary;
  initialLanguage?: DeskLanguageMode;
}

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("kpi_visibility_change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("kpi_visibility_change", cb);
  };
}

function useVisibilityFlag(storageKey: string): [boolean, () => void] {
  const visible = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        const val = localStorage.getItem(storageKey);
        return val === null ? true : val === "true";
      } catch {
        return true;
      }
    },
    () => true
  );

  function toggle() {
    try {
      localStorage.setItem(storageKey, String(!visible));
      window.dispatchEvent(new Event("kpi_visibility_change"));
    } catch {}
  }

  return [visible, toggle];
}

export function SalesOverviewCards({
  summary,
  initialLanguage = "ONLY_EN",
}: SalesOverviewCardsProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const currencySymbol = summary.currencySymbol || "RM";
  const todayStr = summary.dateStr || toBusinessDateString(new Date());
  const yesterdayStr = (() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - 1)).toISOString().slice(0, 10);
  })();
  const [isTodayDetailsOpen, setIsTodayDetailsOpen] = useState(false);
  const [detailsDateStr, setDetailsDateStr] = useState<string>(todayStr);
  const [showToday, toggleToday] = useVisibilityFlag("admin_show_today_sales");
  const [showYesterday, toggleYesterday] = useVisibilityFlag("admin_show_yesterday_sales");
  const [showMonth, toggleMonth] = useVisibilityFlag("admin_show_month_sales");

  const monthParts = summary.dateStr?.split("-") ?? [];
  const zhMonthLabel =
    monthParts.length >= 2
      ? `${monthParts[0]}年${parseInt(monthParts[1], 10)}月`
      : "本月";

  const metrics = [
    {
      key: "today",
      label: isZh ? "今日营收" : "Today",
      amount: summary.totalSalesCents,
      meta: isZh
        ? `${summary.completedCount} 单已完成 · ${summary.pendingCount} 单待处理`
        : `${summary.completedCount} completed · ${summary.pendingCount} pending`,
      visible: showToday,
      onToggle: toggleToday,
      accent: true,
    },
    {
      key: "yesterday",
      label: isZh ? "昨日营收" : "Yesterday",
      amount: summary.yesterdaySalesCents || 0,
      meta: isZh
        ? `${summary.yesterdayCompletedCount || 0} 单已完成`
        : `${summary.yesterdayCompletedCount || 0} completed`,
      visible: showYesterday,
      onToggle: toggleYesterday,
      accent: false,
    },
    {
      key: "month",
      label: isZh ? zhMonthLabel : summary.monthLabel || "This Month",
      amount: summary.monthSalesCents || 0,
      meta: isZh
        ? `${summary.monthCompletedCount || 0} 单已完成`
        : `${summary.monthCompletedCount || 0} completed`,
      visible: showMonth,
      onToggle: toggleMonth,
      accent: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {isZh ? "总览" : "Dashboard"}
        </h1>

        <Link href="/admin/desk">
          <Button size="sm" className="rounded-lg font-semibold gap-1.5 cursor-pointer">
            <Scissors className="h-3.5 w-3.5" />
            <span>{isZh ? "打开收银台" : "Open POS"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Unified KPI Strip */}
      <div className="rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
        {metrics.map((m) => {
          const isDailyClickable = m.key === "today" || m.key === "yesterday";
          const targetDate = m.key === "yesterday" ? yesterdayStr : todayStr;
          const openForDate = () => {
            setDetailsDateStr(targetDate);
            setIsTodayDetailsOpen(true);
          };
          return (
            <div
              key={m.key}
              onClick={isDailyClickable ? openForDate : undefined}
              role={isDailyClickable ? "button" : undefined}
              tabIndex={isDailyClickable ? 0 : undefined}
              onKeyDown={
                isDailyClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openForDate();
                      }
                    }
                  : undefined
              }
              className={`p-5 flex flex-col justify-between gap-3 ${
                isDailyClickable ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    m.onToggle();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    isZh ? `切换${m.label}显示状态` : `Toggle ${m.label} visibility`
                  }
                >
                  {m.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 opacity-50" />
                  )}
                </button>
              </div>

              <div
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
                  m.accent ? "text-primary" : "text-foreground"
                }`}
              >
                {m.visible
                  ? formatPrice(m.amount, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                <span>{m.meta}</span>
                {isDailyClickable && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-primary shrink-0">
                    {isZh ? "查看明细" : "Details"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TodaySalesDetailsDialog
        open={isTodayDetailsOpen}
        onOpenChange={setIsTodayDetailsOpen}
        initialDateStr={detailsDateStr}
        languageMode={langMode}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
