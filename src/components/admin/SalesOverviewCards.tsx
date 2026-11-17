"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { DeskDailySummary } from "@/actions/desk";
import { Eye, EyeOff, Scissors, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

interface SalesOverviewCardsProps {
  summary: DeskDailySummary;
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

export function SalesOverviewCards({ summary }: SalesOverviewCardsProps) {
  const currencySymbol = summary.currencySymbol || "RM";
  const [showToday, toggleToday] = useVisibilityFlag("admin_show_today_sales");
  const [showYesterday, toggleYesterday] = useVisibilityFlag("admin_show_yesterday_sales");
  const [showMonth, toggleMonth] = useVisibilityFlag("admin_show_month_sales");

  const metrics = [
    {
      label: "Today",
      amount: summary.totalSalesCents,
      meta: `${summary.completedCount} completed · ${summary.pendingCount} pending`,
      visible: showToday,
      onToggle: toggleToday,
      accent: true,
    },
    {
      label: "Yesterday",
      amount: summary.yesterdaySalesCents || 0,
      meta: `${summary.yesterdayCompletedCount || 0} completed`,
      visible: showYesterday,
      onToggle: toggleYesterday,
      accent: false,
    },
    {
      label: summary.monthLabel || "This Month",
      amount: summary.monthSalesCents || 0,
      meta: `${summary.monthCompletedCount || 0} completed`,
      visible: showMonth,
      onToggle: toggleMonth,
      accent: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>

        <Link href="/admin/desk">
          <Button size="sm" className="rounded-lg font-semibold gap-1.5 cursor-pointer">
            <Scissors className="h-3.5 w-3.5" />
            <span>Open POS</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Unified KPI Strip */}
      <div className="rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {metrics.map((m) => (
          <div key={m.label} className="p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <button
                type="button"
                onClick={m.onToggle}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={`Toggle ${m.label} visibility`}
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

            <div className="text-xs text-muted-foreground tabular-nums">{m.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
