"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTodaySalesDetails,
  type TodaySalesDetailsDto,
  type TodaySalePaymentMethod,
} from "@/actions/desk";
import { formatPrice, toBusinessDateString } from "@/lib/utils";
import { resolveServiceName } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";
import type { CustomerReceiptData } from "@/lib/whatsapp";
import { CustomerReceiptDialog } from "./CustomerReceiptDialog";
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
  Loader2,
  RefreshCw,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  Receipt,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface TodaySalesDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDateStr?: string;
  languageMode?: DeskLanguageMode;
  currencySymbol?: string;
}

type ChannelFilter = "ALL" | TodaySalePaymentMethod;

function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function TodaySalesDetailsDialog({
  open,
  onOpenChange,
  initialDateStr,
  languageMode = "ONLY_EN",
  currencySymbol = "RM",
}: TodaySalesDetailsDialogProps) {
  const isZh = languageMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const todayStr = toBusinessDateString(new Date());
  const yesterdayStr = shiftDateString(todayStr, -1);

  const [overrideDateStr, setOverrideDateStr] = useState<string | null>(null);
  const selectedDateStr = overrideDateStr ?? (initialDateStr || todayStr);
  const [data, setData] = useState<TodaySalesDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChannelFilter>("ALL");
  const [copied, setCopied] = useState(false);
  const [selectedReceipt, setSelectedReceipt] =
    useState<CustomerReceiptData | null>(null);

  const fetchForDate = useCallback(
    async (dateToLoad: string) => {
      setIsLoading(true);
      setError(null);
      const res = await getTodaySalesDetails(dateToLoad);
      if (res.success) {
        setData(res.data);
      } else {
        setError(
          res.error || (isZh ? "加载日结明细失败。" : "Failed to load daily sales.")
        );
      }
      setIsLoading(false);
    },
    [isZh]
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      setIsLoading(true);
      const res = await getTodaySalesDetails(selectedDateStr);
      if (!active) return;
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(
          res.error || (isZh ? "加载日结明细失败。" : "Failed to load daily sales.")
        );
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, selectedDateStr, isZh]);

  const currSym = data?.currencySymbol || currencySymbol;
  const filteredItems = (data?.items || []).filter(
    (item) => filter === "ALL" || item.paymentMethod === filter
  );

  const isViewingToday = selectedDateStr === todayStr;
  const isViewingYesterday = selectedDateStr === yesterdayStr;
  const canGoNext = selectedDateStr < todayStr;

  const headingText = isViewingToday
    ? t("Today's Sales Details", "今日营收明细")
    : isViewingYesterday
    ? t("Yesterday's Sales Details", "昨日营收明细")
    : t("Daily Sales Details", "每日营收明细");

  async function handleCopySummary() {
    if (!data) return;
    const lines = [
      `📊 ${t("Daily Closing", "每日营收小结")} (${data.dateStr})`,
      `${t("Gross Sales", "总营收")}: ${formatPrice(data.totalSalesCents, currSym)} (${data.totalCount} ${t("orders", "笔")})`,
      `• ${t("Cash", "现金")}: ${formatPrice(data.paymentChannels.cashCents, currSym)} (${data.paymentChannels.cashCount})`,
      `• DuitNow QR: ${formatPrice(data.paymentChannels.qrCents, currSym)} (${data.paymentChannels.qrCount})`,
      `• ${t("Card", "刷卡")}: ${formatPrice(data.paymentChannels.cardCents, currSym)} (${data.paymentChannels.cardCount})`,
    ];
    if (data.paymentChannels.otherCount > 0) {
      lines.push(
        `• ${t("Other", "其他")}: ${formatPrice(data.paymentChannels.otherCents, currSym)} (${data.paymentChannels.otherCount})`
      );
    }
    if (data.totalExpensesCents > 0) {
      lines.push(
        `${t("Expenses", "当日支出")}: -${formatPrice(data.totalExpensesCents, currSym)} (${data.expensesCount})`
      );
      lines.push(
        `${t("Net", "净收款")}: ${formatPrice(data.netSalesCents, currSym)}`
      );
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success(t("Daily summary copied.", "已复制今日收款小结。"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Failed to copy.", "复制失败。"));
    }
  }

  const channelCards: {
    key: TodaySalePaymentMethod;
    label: string;
    cents: number;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }[] = [
    {
      key: "CASH",
      label: t("Cash", "现金"),
      cents: data?.paymentChannels.cashCents ?? 0,
      count: data?.paymentChannels.cashCount ?? 0,
      icon: Banknote,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "DUITNOW_QR",
      label: "DuitNow QR",
      cents: data?.paymentChannels.qrCents ?? 0,
      count: data?.paymentChannels.qrCount ?? 0,
      icon: QrCode,
      accent: "text-primary",
    },
    {
      key: "CARD",
      label: t("Card", "刷卡"),
      cents: data?.paymentChannels.cardCents ?? 0,
      count: data?.paymentChannels.cardCount ?? 0,
      icon: CreditCard,
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "OTHER",
      label: t("Other / Credit", "其他 / 储值"),
      cents: data?.paymentChannels.otherCents ?? 0,
      count: data?.paymentChannels.otherCount ?? 0,
      icon: Wallet,
      accent: "text-amber-600 dark:text-amber-400",
    },
  ];

  const sourceBadge = (source: TodaySalesDetailsDto["items"][number]["source"]) => {
    switch (source) {
      case "WALKIN":
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {t("Walk-in", "散客")}
          </Badge>
        );
      case "BOOKING":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {t("Booking", "预约")}
          </Badge>
        );
      case "MEMBER_RELOAD":
        return (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
            {t("Credit Reload", "会员充值")}
          </Badge>
        );
      case "MEMBER_PROMO":
        return (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">
            {t("Promo", "配套")}
          </Badge>
        );
    }
  };

  const paymentLabel = (method: TodaySalePaymentMethod) => {
    if (method === "CASH") return t("Cash", "现金");
    if (method === "DUITNOW_QR") return "QR";
    if (method === "CARD") return t("Card", "刷卡");
    return t("Other", "其他");
  };

  const formatItemTitle = (item: TodaySalesDetailsDto["items"][number]) => {
    if (item.source === "MEMBER_RELOAD") return t("Member Credit Reload", "会员储值充值");
    if (item.source === "MEMBER_PROMO") return item.title;
    return item.title
      .split(", ")
      .map((part) => resolveServiceName(part, languageMode).primary)
      .join(", ");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setOverrideDateStr(null);
          setFilter("ALL");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col overflow-hidden rounded-2xl">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-2 pr-7">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate" suppressHydrationWarning>
                  {headingText}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {data?.dateStr || selectedDateStr} ·{" "}
                {t(
                  `${data?.totalCount ?? 0} transactions`,
                  `共 ${data?.totalCount ?? 0} 笔交易`
                )}{" "}
                ·{" "}
                <span className="font-mono font-bold text-primary">
                  {formatPrice(data?.totalSalesCents ?? 0, currSym)}
                </span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopySummary()}
                disabled={!data || isLoading}
                className="h-9 px-2.5 rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
                title={t("Copy summary", "复制小结")}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="hidden sm:inline">
                  {copied ? t("Copied", "已复制") : t("Copy", "复制")}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void fetchForDate(selectedDateStr)}
                disabled={isLoading}
                className="h-9 w-9 rounded-lg shrink-0 cursor-pointer"
                title={t("Refresh", "刷新")}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Date Switcher Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="inline-flex items-center gap-1 bg-muted/50 border border-border p-1 rounded-xl">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOverrideDateStr(shiftDateString(selectedDateStr, -1))}
                disabled={isLoading}
                className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg cursor-pointer"
                aria-label={t("Previous day", "前一天")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <input
                type="date"
                max={todayStr}
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) setOverrideDateStr(e.target.value);
                }}
                className="h-9 sm:h-8 px-2 bg-transparent text-xs sm:text-sm font-semibold font-mono text-foreground focus:outline-none cursor-pointer"
                aria-label={t("Select date", "选择日期")}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = shiftDateString(selectedDateStr, 1);
                  setOverrideDateStr(next > todayStr ? todayStr : next);
                }}
                disabled={isLoading || !canGoNext}
                className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg cursor-pointer"
                aria-label={t("Next day", "后一天")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isViewingToday && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideDateStr(todayStr)}
                disabled={isLoading}
                className="h-10 sm:h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {t("Today", "回到今天")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Payment Channels Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {channelCards.map((ch) => {
            const Icon = ch.icon;
            const isSelected = filter === ch.key;
            return (
              <button
                key={ch.key}
                type="button"
                onClick={() => setFilter((prev) => (prev === ch.key ? "ALL" : ch.key))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-muted-foreground">
                  <span className="truncate">{ch.label}</span>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${ch.accent}`} />
                </div>
                <div className="font-mono font-bold text-sm sm:text-base tabular-nums mt-1 text-foreground">
                  {formatPrice(ch.cents, currSym)}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {ch.count} {t(ch.count === 1 ? "order" : "orders", "笔")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Daily Expenses & Net Strip (shown when expenses exist on selected date) */}
        {data && data.totalExpensesCents > 0 && (
          <div className="px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums shrink-0">
            <span className="text-muted-foreground">
              {t("Expenses on this day", "当日支出")} ({data.expensesCount}):{" "}
              <span className="font-mono font-semibold text-destructive">
                -{formatPrice(data.totalExpensesCents, currSym)}
              </span>
            </span>
            <span className="font-semibold text-foreground">
              {t("Net", "净收款")}:{" "}
              <span
                className={`font-mono font-bold ${
                  data.netSalesCents >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {formatPrice(data.netSalesCents, currSym)}
              </span>
            </span>
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {(
            [
              { key: "ALL", label: t("All", "全部") },
              { key: "CASH", label: t("Cash", "现金") },
              { key: "DUITNOW_QR", label: "QR" },
              { key: "CARD", label: t("Card", "刷卡") },
              { key: "OTHER", label: t("Other", "其他") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Itemized List */}
        <div className="flex-1 min-h-[180px] overflow-y-auto space-y-2 pr-1">
          {isLoading || (!data && !error) ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t("Loading daily sales…", "正在加载当日明细…")}</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-40 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
              <Receipt className="h-6 w-6 opacity-40" />
              <span>
                {filter === "ALL"
                  ? t("No completed sales recorded on this date.", "该日期暂无已完成收款记录。")
                  : t("No transactions for this payment method on this date.", "该日期此收款方式暂无记录。")}
              </span>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={`${item.source}-${item.id}`}
                className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums">
                      {item.timeStr}
                    </span>
                    {sourceBadge(item.source)}
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {item.referenceCode}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {formatItemTitle(item)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.customerName}
                    {item.phoneNumber && !item.phoneNumber.startsWith("WALKIN-")
                      ? ` · ${item.phoneNumber}`
                      : ""}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1.5 flex flex-col items-end">
                  <div className="font-mono font-bold text-sm tabular-nums text-foreground">
                    {formatPrice(item.amountCents, currSym)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                      {paymentLabel(item.paymentMethod)}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReceipt(item.receipt)}
                      className="h-7 px-2 rounded-md text-[11px] font-semibold gap-1 cursor-pointer"
                      title={t("View / Print / WhatsApp Receipt", "查看 / 打印 / 发送收据")}
                    >
                      <Receipt className="h-3 w-3 text-primary" />
                      <span>{t("Receipt", "收据")}</span>
                    </Button>
                  </div>
                  {item.creditUsedCents > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                      -{formatPrice(item.creditUsedCents, currSym)} {t("credit", "储值")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 py-4 sm:px-6 gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 sm:h-9 w-full sm:w-auto px-5 rounded-xl font-semibold cursor-pointer"
          >
            {t("Close", "关闭")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CustomerReceiptDialog
        receipt={selectedReceipt}
        open={!!selectedReceipt}
        onOpenChange={(nextOpen) => !nextOpen && setSelectedReceipt(null)}
        currencySymbol={currSym}
        languageMode={languageMode}
      />
    </Dialog>
  );
}
