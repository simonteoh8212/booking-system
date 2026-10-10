"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { DeskDailySummary } from "@/actions/desk";
import {
  TrendingUp,
  History,
  CalendarRange,
  Scissors,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SalesOverviewCardsProps {
  summary: DeskDailySummary;
}

export function SalesOverviewCards({ summary }: SalesOverviewCardsProps) {
  const currencySymbol = summary.currencySymbol || "RM";
  const [showToday, setShowToday] = useState(true);
  const [showYesterday, setShowYesterday] = useState(true);
  const [showMonth, setShowMonth] = useState(true);

  useEffect(() => {
    try {
      const storedToday = localStorage.getItem("admin_show_today_sales");
      if (storedToday !== null) setShowToday(storedToday === "true");

      const storedYesterday = localStorage.getItem("admin_show_yesterday_sales");
      if (storedYesterday !== null) setShowYesterday(storedYesterday === "true");

      const storedMonth = localStorage.getItem("admin_show_month_sales");
      if (storedMonth !== null) setShowMonth(storedMonth === "true");
    } catch {}
  }, []);

  function toggleToday() {
    setShowToday((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_show_today_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleYesterday() {
    setShowYesterday((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_show_yesterday_sales", String(next));
      } catch {}
      return next;
    });
  }

  function toggleMonth() {
    setShowMonth((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_show_month_sales", String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Sales Overview / 销售业绩概览</span>
            <Badge variant="outline" className="text-xs font-mono">
              {summary.currencySymbol === "$" ? "🇦🇺 AUD ($)" : "🇲🇾 MYR (RM)"}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time daily & monthly revenue snapshot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/desk">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-bold gap-2 shadow-xs border border-border/80 bg-card hover:bg-muted text-foreground cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span>P&L Report / 财务月报</span>
            </Button>
          </Link>
          <Link href="/admin/desk">
            <Button
              size="sm"
              className="rounded-xl font-bold gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <Scissors className="h-4 w-4" />
              <span>Open Salon Desk (POS) / 柜台收银</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Sales Cards: Direction 2 - Square / Retail POS Tactile Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-5 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                Today&apos;s Sales / 今日
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                Today
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                {showToday
                  ? formatPrice(summary.totalSalesCents, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleToday}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showToday ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showToday ? "Hide today sales" : "Show today sales"}
              >
                {showToday ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completed Clients
            </span>
            <span className="font-bold font-mono text-foreground">
              {summary.completedCount} clients ({summary.pendingCount} waiting)
            </span>
          </div>
        </Card>

        {/* Yesterday's Sales */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-5 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <History className="h-4 w-4" />
                </div>
                Yesterday / 昨日
              </span>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                Yesterday
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                {showYesterday
                  ? formatPrice(summary.yesterdaySalesCents || 0, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleYesterday}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showYesterday ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showYesterday ? "Hide yesterday sales" : "Show yesterday sales"}
              >
                {showYesterday ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Completed Clients
            </span>
            <span className="font-bold font-mono text-foreground">
              {summary.yesterdayCompletedCount || 0} clients
            </span>
          </div>
        </Card>

        {/* Monthly Sales */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-5 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CalendarRange className="h-4 w-4" />
                </div>
                Monthly / 本月
              </span>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                {summary.monthLabel || "This Month"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                {showMonth
                  ? formatPrice(summary.monthSalesCents || 0, currencySymbol)
                  : `${currencySymbol} ••••••`}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleMonth}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showMonth ? "Hide sales / 隐藏金额" : "Show sales / 显示金额"}
                aria-label={showMonth ? "Hide monthly sales" : "Show monthly sales"}
              >
                {showMonth ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Completed Clients
            </span>
            <span className="font-bold font-mono text-foreground">
              {summary.monthCompletedCount || 0} clients
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
