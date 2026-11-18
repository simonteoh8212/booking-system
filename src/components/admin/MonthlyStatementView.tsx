"use client";

import { useState, useTransition, useEffect } from "react";
import { getMonthlyStatementData, type MonthlyStatementDto } from "@/actions/statement";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import toast from "react-hot-toast";
import type { DeskLanguageMode } from "@/types";

interface MonthlyStatementViewProps {
  initialData: MonthlyStatementDto;
  backHref?: string;
  onBack?: () => void;
  initialLanguage?: DeskLanguageMode;
}

const MONTH_SHORT_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthlyStatementView({
  initialData,
  onBack,
  initialLanguage = "ONLY_EN",
}: MonthlyStatementViewProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [statement, setStatement] = useState<MonthlyStatementDto>(initialData);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.month);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(initialData.includeExpenses);
  const [isPending, startTransition] = useTransition();

  const [pageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    function handleBeforePrint() {
      setIsPrinting(true);
    }
    function handleAfterPrint() {
      setIsPrinting(false);
    }
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  function fetchStatement(year: number, month: number, withExpenses: boolean) {
    startTransition(async () => {
      const res = await getMonthlyStatementData(year, month, withExpenses);
      if (res.success && res.data) {
        setStatement(res.data);
        setCurrentPage(1);
      } else {
        toast.error(t("Failed to load statement data.", "加载对账单失败。"));
      }
    });
  }

  function handlePrevMonth() {
    let y = selectedYear;
    let m = selectedMonth - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedYear(y);
    setSelectedMonth(m);
    fetchStatement(y, m, includeExpenses);
  }

  function handleNextMonth() {
    let y = selectedYear;
    let m = selectedMonth + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedYear(y);
    setSelectedMonth(m);
    fetchStatement(y, m, includeExpenses);
  }

  function handleCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setSelectedYear(y);
    setSelectedMonth(m);
    fetchStatement(y, m, includeExpenses);
  }

  function handleToggleExpenses() {
    const nextVal = !includeExpenses;
    setIncludeExpenses(nextVal);
    fetchStatement(selectedYear, selectedMonth, nextVal);
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      setIsPrinting(true);
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 150);
    }
  }

  function handleExportCsv() {
    try {
      const link = document.createElement("a");
      link.href = `/api/admin/export-sales?year=${selectedYear}&month=${selectedMonth}`;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("Downloading CSV…", "正在下载 CSV…"));
    } catch {
      toast.error(t("Export failed.", "导出失败。"));
    }
  }

  const currSym = statement.currencySymbol || "RM";
  const grossSalesFormatted = formatPrice(statement.grossSalesCents, currSym);
  const expensesFormatted = formatPrice(statement.totalExpensesCents, currSym);
  const netProfitFormatted = formatPrice(statement.netProfitCents, currSym);
  const isNetPositive = statement.netProfitCents >= 0;

  const totalTransactions = statement.transactions.length;
  const isPaged = !showAllRows && !isPrinting && totalTransactions > pageSize;
  const totalPages = Math.ceil(totalTransactions / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedTransactions = isPaged
    ? statement.transactions.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize
      )
    : statement.transactions;

  const monthLabel = isZh
    ? `${selectedYear}年${String(selectedMonth).padStart(2, "0")}月`
    : `${MONTH_SHORT_EN[selectedMonth - 1] ?? selectedMonth} ${selectedYear}`;

  return (
    <div className="space-y-5 select-none print:p-0 print:m-0 print:bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Bar (Hidden when printing) */}
      <div className="print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{t("Back", "返回")}</span>
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" suppressHydrationWarning>
              {t("Statements", "月度对账单")}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <Download className="h-4 w-4 text-primary shrink-0" />
              <span suppressHydrationWarning>{t("Export CSV", "导出 CSV")}</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="h-9 px-3.5 rounded-lg font-semibold gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span suppressHydrationWarning>{t("Print / PDF", "打印 / PDF")}</span>
            </Button>
          </div>
        </div>

        {/* Month Selector & Expenses Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1 bg-card p-1 rounded-xl border border-border self-start">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              disabled={isPending}
              className="h-8 w-8 rounded-lg cursor-pointer"
              title={t("Previous month", "上个月")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span
              className="font-semibold text-sm px-2.5 text-foreground min-w-[100px] text-center tabular-nums"
              suppressHydrationWarning
            >
              {monthLabel}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              disabled={isPending}
              className="h-8 w-8 rounded-lg cursor-pointer"
              title={t("Next month", "下个月")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCurrentMonth}
              disabled={isPending}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <span suppressHydrationWarning>{t("This Month", "本月")}</span>
            </Button>
          </div>

          <button
            type="button"
            onClick={handleToggleExpenses}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto ${
              includeExpenses
                ? "bg-primary/10 border-primary/30 text-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                includeExpenses
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/40 bg-background"
              }`}
            >
              {includeExpenses && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
            </span>
            <span suppressHydrationWarning>{t("Include Expenses", "含开支与利润")}</span>
          </button>
        </div>
      </div>

      {/* Printable Statement Sheet */}
      <div
        id="statement-print-area"
        className="bg-card text-foreground border border-border rounded-xl p-4 sm:p-6 shadow-xs print:bg-white print:text-zinc-900 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none space-y-5"
      >
        {/* Letterhead & Meta */}
        <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 print:border-zinc-300">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground print:text-zinc-900">
              {statement.businessName}
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5 print:text-zinc-600">
              {statement.businessPhone}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-muted-foreground space-y-0.5 tabular-nums print:text-zinc-600">
            <div className="font-mono font-semibold text-foreground print:text-zinc-900">
              {statement.statementNo}
            </div>
            <div>
              {statement.periodStart} ~ {statement.periodEnd} · {statement.currency}
            </div>
          </div>
        </div>

        {/* Unified 1px-Divided KPI Strip */}
        <div
          className={`rounded-xl border border-border bg-background/50 grid divide-y sm:divide-y-0 sm:divide-x divide-border print:bg-white print:border-zinc-300 print:divide-zinc-300 ${
            includeExpenses ? "grid-cols-1 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
          <div className="p-4">
            <span className="text-xs font-medium text-muted-foreground block print:text-zinc-600" suppressHydrationWarning>
              {t("Gross Revenue", "营业总额")}
            </span>
            <span className="text-xl font-bold text-foreground mt-1 block tabular-nums print:text-zinc-950">
              {grossSalesFormatted}
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums print:text-zinc-600" suppressHydrationWarning>
              {statement.completedOrdersCount} {t("orders", "笔")}
            </span>
          </div>

          <div className="p-4">
            <span className="text-xs font-medium text-muted-foreground block print:text-zinc-600" suppressHydrationWarning>
              {t("Clients Served", "服务客数")}
            </span>
            <span className="text-xl font-bold text-foreground mt-1 block tabular-nums print:text-zinc-950">
              {statement.completedOrdersCount}
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums print:text-zinc-600" suppressHydrationWarning>
              {t("Avg", "均价")} {formatPrice(statement.averageOrderCents, currSym)}
            </span>
          </div>

          {includeExpenses ? (
            <>
              <div className="p-4">
                <span className="text-xs font-medium text-muted-foreground block print:text-zinc-600" suppressHydrationWarning>
                  {t("Expenses", "店铺开支")}
                </span>
                <span className="text-xl font-bold text-foreground mt-1 block tabular-nums print:text-zinc-950">
                  {expensesFormatted}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums print:text-zinc-600" suppressHydrationWarning>
                  {statement.expenseCount} {t("entries", "笔")}
                </span>
              </div>

              <div className="p-4">
                <span className="text-xs font-medium text-muted-foreground block print:text-zinc-600" suppressHydrationWarning>
                  {t("Net Profit", "净利润")}
                </span>
                <span
                  className={`text-xl font-bold mt-1 block tabular-nums print:text-zinc-950 ${
                    isNetPositive ? "text-primary" : "text-destructive"
                  }`}
                >
                  {netProfitFormatted}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums print:text-zinc-600" suppressHydrationWarning>
                  {statement.profitMarginPercent}% {t("margin", "利润率")}
                </span>
              </div>
            </>
          ) : (
            <div className="p-4">
              <span className="text-xs font-medium text-muted-foreground block print:text-zinc-600" suppressHydrationWarning>
                {t("Avg. Ticket", "平均客单价")}
              </span>
              <span className="text-xl font-bold text-foreground mt-1 block tabular-nums print:text-zinc-950">
                {formatPrice(statement.averageOrderCents, currSym)}
              </span>
            </div>
          )}
        </div>

        {/* Payment Channels & Top Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-background/40 print:bg-white print:border-zinc-300">
            <div className="text-xs font-semibold text-muted-foreground mb-3 print:text-zinc-600" suppressHydrationWarning>
              {t("Payment Channels", "收款渠道")}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground print:text-zinc-700">
                  <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>DuitNow QR</span>
                </span>
                <span className="font-semibold text-foreground tabular-nums print:text-zinc-950">
                  {formatPrice(statement.paymentChannels.qrCents, currSym)}
                  <span className="text-muted-foreground font-normal ml-1.5 print:text-zinc-500">
                    ({statement.paymentChannels.qrCount})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground print:text-zinc-700">
                  <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                  <span suppressHydrationWarning>{t("Cash", "现金")}</span>
                </span>
                <span className="font-semibold text-foreground tabular-nums print:text-zinc-950">
                  {formatPrice(statement.paymentChannels.cashCents, currSym)}
                  <span className="text-muted-foreground font-normal ml-1.5 print:text-zinc-500">
                    ({statement.paymentChannels.cashCount})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground print:text-zinc-700">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span suppressHydrationWarning>{t("Card", "刷卡")}</span>
                </span>
                <span className="font-semibold text-foreground tabular-nums print:text-zinc-950">
                  {formatPrice(statement.paymentChannels.cardCents, currSym)}
                  <span className="text-muted-foreground font-normal ml-1.5 print:text-zinc-500">
                    ({statement.paymentChannels.cardCount})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background/40 print:bg-white print:border-zinc-300">
            <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between print:text-zinc-600">
              <span suppressHydrationWarning>{t("Top Services", "热门服务")}</span>
              <span className="tabular-nums">{statement.topServices.length}</span>
            </div>
            <div className="space-y-2 text-xs">
              {statement.topServices.slice(0, 3).map((svc) => (
                <div key={svc.serviceName} className="flex items-center justify-between gap-2">
                  <span className="text-foreground truncate print:text-zinc-800">{svc.serviceName}</span>
                  <span className="font-semibold text-foreground shrink-0 tabular-nums print:text-zinc-950">
                    {svc.count}× · {formatPrice(svc.totalCents, currSym)}
                  </span>
                </div>
              ))}
              {statement.topServices.length === 0 && (
                <div className="text-muted-foreground text-xs" suppressHydrationWarning>
                  {t("No records", "暂无记录")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm print:text-zinc-900" suppressHydrationWarning>
                {t("Transactions", "交易明细")}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] tabular-nums print:bg-zinc-100 print:text-zinc-700">
                {totalTransactions}
              </span>
            </div>

            {totalTransactions > pageSize && (
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="print:hidden px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium cursor-pointer transition-colors"
              >
                {showAllRows
                  ? t("Paginate (25/page)", "分页显示 (25条)")
                  : t(`Show all (${totalTransactions})`, `显示全部 (${totalTransactions})`)}
              </button>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-x-auto print:border-zinc-300">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground print:bg-zinc-100 print:border-zinc-300 print:text-zinc-700">
                  <th className="py-2.5 px-3" suppressHydrationWarning>{t("Date", "日期")}</th>
                  <th className="py-2.5 px-2" suppressHydrationWarning>{t("Ref", "单号")}</th>
                  <th className="py-2.5 px-3" suppressHydrationWarning>{t("Client", "顾客")}</th>
                  <th className="py-2.5 px-3" suppressHydrationWarning>{t("Services", "项目")}</th>
                  <th className="py-2.5 px-2 text-center" suppressHydrationWarning>{t("Method", "方式")}</th>
                  <th className="py-2.5 px-3 text-right" suppressHydrationWarning>{t("Amount", "金额")} ({currSym})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-zinc-200">
                {displayedTransactions.map((tx) => {
                  const servicesList =
                    tx.serviceNames && tx.serviceNames.length > 0
                      ? tx.serviceNames
                      : tx.services.split(", ").filter(Boolean);

                  return (
                    <tr
                      key={tx.id}
                      className="text-foreground text-xs align-top hover:bg-muted/30 transition-colors print:text-zinc-800"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground tabular-nums print:text-zinc-600">
                        {tx.dateStr.slice(5)} {tx.timeStr}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap font-mono font-semibold text-foreground print:text-zinc-900">
                        {tx.referenceCode}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground print:text-zinc-900">
                        {tx.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-foreground print:text-zinc-800">
                        <div className="flex flex-col gap-1">
                          {servicesList.map((svcName, sIdx) => (
                            <div key={sIdx} className="leading-tight">
                              {svcName}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-center text-[11px]">
                        <span className="px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground font-medium print:border-zinc-200 print:bg-zinc-100 print:text-zinc-700">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-foreground whitespace-nowrap tabular-nums print:text-zinc-950">
                        {(tx.amountCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {statement.transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground" suppressHydrationWarning>
                      {t("No transactions this month", "本月暂无交易")}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t border-border font-semibold text-foreground print:bg-zinc-100 print:border-t-2 print:border-zinc-900 print:text-zinc-900">
                  <td colSpan={5} className="py-2.5 px-3 text-right text-xs" suppressHydrationWarning>
                    {t("Total", "合计")}
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm tabular-nums">
                    {grossSalesFormatted}
                  </td>
                </tr>
              </tfoot>
            </table>

            {isPaged && (
              <div className="print:hidden px-3 sm:px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground text-[11px] whitespace-nowrap tabular-nums">
                  {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, totalTransactions)} / {totalTransactions}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold text-foreground cursor-pointer"
                  >
                    {t("Prev", "上一页")}
                  </button>

                  <span className="px-2 text-[11px] font-semibold text-foreground tabular-nums">
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold text-foreground cursor-pointer"
                  >
                    {t("Next", "下一页")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
