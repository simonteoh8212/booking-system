"use client";

import { useState, useTransition } from "react";
import { getMonthlyStatementData, type MonthlyStatementDto } from "@/actions/statement";
import { DESK_DICT, resolveDeskText } from "@/lib/desk-i18n";
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

interface MonthlyStatementViewProps {
  initialData: MonthlyStatementDto;
  backHref?: string;
  onBack?: () => void;
}

export function MonthlyStatementView({
  initialData,
  backHref = "/admin/desk",
  onBack,
}: MonthlyStatementViewProps) {
  const [statement, setStatement] = useState<MonthlyStatementDto>(initialData);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.month);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(initialData.includeExpenses);
  const [isPending, startTransition] = useTransition();

  function fetchStatement(year: number, month: number, withExpenses: boolean) {
    startTransition(async () => {
      const res = await getMonthlyStatementData(year, month, withExpenses);
      if (res.success && res.data) {
        setStatement(res.data);
      } else {
        toast.error("Failed to load statement data.");
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
      window.print();
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
      toast.success("正在下载本月销售账单 (CSV)...");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  }

  const currSym = statement.currencySymbol || "RM";
  const grossSalesFormatted = formatPrice(statement.grossSalesCents, currSym);
  const expensesFormatted = formatPrice(statement.totalExpensesCents, currSym);
  const netProfitFormatted = formatPrice(statement.netProfitCents, currSym);
  const isNetPositive = statement.netProfitCents >= 0;

  return (
    <div className="min-h-screen bg-muted/40 py-6 sm:py-10 px-3 sm:px-6 select-none print:p-0 print:m-0 print:bg-white print:min-h-0">
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
          header, nav {
            display: none !important;
          }
        }
      `}</style>

      {/* ── TOP INTERACTIVE TOOLBAR (HIDDEN WHEN PRINTING) ── */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack ? (
              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                size="lg"
                className="h-12 px-4 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-foreground gap-2 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>返回前台 / Back</span>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-4 rounded-xl border border-border/80 bg-card hover:bg-muted font-bold text-foreground gap-2 cursor-pointer shadow-xs"
              >
                <a href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>返回主页 / Back</span>
                </a>
              </Button>
            )}

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                月度营业对账单 (Monthly Statement)
              </h1>
              <p className="text-xs text-muted-foreground">
                标准银行月结单格式 · 支持一键另存为 A4 PDF 或 Excel 导出
              </p>
            </div>
          </div>

          {/* Action buttons: Print PDF & Export CSV */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <Button
              type="button"
              onClick={handleExportCsv}
              variant="outline"
              size="lg"
              className="h-12 px-4 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground font-bold gap-2 cursor-pointer shadow-xs text-xs sm:text-sm"
            >
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>导出 CSV</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              size="lg"
              className="h-12 px-5 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold gap-2 cursor-pointer shadow-sm text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>🖨️ 打印 / 另存为 PDF</span>
            </Button>
          </div>
        </div>

        {/* Month Selector Bar & Expenses Toggle Bar */}
        <div className="p-3 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              disabled={isPending}
              className="h-9 w-9 p-0 rounded-xl hover:bg-muted cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="font-mono font-black text-base px-3 text-foreground tracking-wide">
              {selectedYear} 年 {String(selectedMonth).padStart(2, "0")} 月
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              disabled={isPending}
              className="h-9 w-9 p-0 rounded-xl hover:bg-muted cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              disabled={isPending}
              className="h-8 px-3 rounded-lg text-xs font-semibold border-border/80 hover:bg-muted ml-1 cursor-pointer"
            >
              本月 (Current)
            </Button>
          </div>

          {/* Toggle: Include Shop Expenses */}
          <button
            type="button"
            onClick={handleToggleExpenses}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              includeExpenses
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                : "bg-muted/40 border-border/80 text-muted-foreground hover:bg-muted"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                includeExpenses
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-muted-foreground/40 bg-card"
              }`}
            >
              {includeExpenses && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
            </div>
            <span>包含店铺开支与纯利润 (Include Shop Expenses & Net Profit)</span>
          </button>
        </div>
      </div>

      {/* ── THE OFFICIAL A4 BANK STATEMENT CANVAS (PRINTABLE) ── */}
      <div
        id="statement-print-area"
        className="max-w-[210mm] mx-auto bg-white text-zinc-900 border border-zinc-200/90 shadow-lg rounded-2xl p-6 sm:p-10 md:p-12 print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none"
      >
        {/* STATEMENT HEADER (Letterhead & Meta) */}
        <div className="border-b-2 border-zinc-900 pb-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            {/* Left: Salon Business Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase">
                  {statement.businessName}
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium">
                Business Contact / WhatsApp: {statement.businessPhone}
              </p>
              <p className="text-2xs text-zinc-500 uppercase tracking-widest font-mono">
                OFFICIAL BUSINESS ACCOUNTING & TRANSACTION STATEMENT
              </p>
            </div>

            {/* Right: Statement Meta Box */}
            <div className="text-left sm:text-right space-y-1 sm:space-y-0.5 font-mono text-xs text-zinc-700 bg-zinc-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-zinc-200">
              <div className="text-sm font-black text-zinc-900 tracking-wider">
                MONTHLY STATEMENT
              </div>
              <div>
                <span className="text-zinc-500">Statement Ref: </span>
                <span className="font-bold text-zinc-900">{statement.statementNo}</span>
              </div>
              <div>
                <span className="text-zinc-500">Period: </span>
                <span className="font-semibold">{statement.periodStart} ~ {statement.periodEnd}</span>
              </div>
              <div>
                <span className="text-zinc-500">Issued: </span>
                <span>{statement.generatedAt.slice(0, 10)} {statement.generatedAt.slice(11, 16)}</span>
              </div>
              <div>
                <span className="text-zinc-500">Currency: </span>
                <span className="font-bold">{statement.currency} ({statement.currencySymbol})</span>
              </div>
            </div>
          </div>
        </div>

        {/* EXECUTIVE FINANCIAL SUMMARY CARDS */}
        <div className="mb-6">
          <div className="text-2xs uppercase tracking-widest font-bold text-zinc-500 mb-2 font-mono">
            1. EXECUTIVE FINANCIAL SUMMARY (月度收支财务总览)
          </div>
          <div
            className={`grid gap-3 ${
              includeExpenses
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-3"
            }`}
          >
            {/* Box 1: Gross Sales */}
            <div className="p-3.5 rounded-xl border border-zinc-300 bg-zinc-50">
              <span className="text-2xs font-bold text-zinc-500 block uppercase">
                营业总额 (Gross Revenue)
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-zinc-950 mt-0.5 block">
                {grossSalesFormatted}
              </span>
              <span className="text-2xs text-zinc-600 block mt-0.5">
                {statement.completedOrdersCount} 笔已完成交易
              </span>
            </div>

            {/* Box 2: Total Clients */}
            <div className="p-3.5 rounded-xl border border-zinc-300 bg-zinc-50">
              <span className="text-2xs font-bold text-zinc-500 block uppercase">
                开单客数 (Clients Served)
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-zinc-950 mt-0.5 block">
                {statement.completedOrdersCount} 人次
              </span>
              <span className="text-2xs text-zinc-600 block mt-0.5">
                客单价: {formatPrice(statement.averageOrderCents, currSym)}
              </span>
            </div>

            {/* Box 3 & 4 (Only when expenses are included) */}
            {includeExpenses ? (
              <>
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                  <span className="text-2xs font-bold text-rose-700 block uppercase">
                    店铺总开支 (Shop Expenses)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-rose-900 mt-0.5 block">
                    {expensesFormatted}
                  </span>
                  <span className="text-2xs text-rose-700/80 block mt-0.5">
                    {statement.expenseCount} 笔采购与杂支
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    isNetPositive
                      ? "border-emerald-300 bg-emerald-50/50 text-emerald-950"
                      : "border-rose-300 bg-rose-50/50 text-rose-950"
                  }`}
                >
                  <span className="text-2xs font-bold block uppercase opacity-80">
                    纯营业利润 (Net Operating Profit)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono mt-0.5 block">
                    {netProfitFormatted}
                  </span>
                  <span className="text-2xs font-semibold block mt-0.5">
                    利润率: {statement.profitMarginPercent}%
                  </span>
                </div>
              </>
            ) : (
              <div className="p-3.5 rounded-xl border border-zinc-300 bg-zinc-50">
                <span className="text-2xs font-bold text-zinc-500 block uppercase">
                  平均客单价 (Avg. Ticket)
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-zinc-950 mt-0.5 block">
                  {formatPrice(statement.averageOrderCents, currSym)}
                </span>
                <span className="text-2xs text-zinc-600 block mt-0.5">每位客户平均消费</span>
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT CHANNELS & SERVICE HIGHLIGHTS (Compact 2-Column Row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Payment Method Breakdown */}
          <div className="p-3.5 rounded-xl border border-zinc-300 bg-zinc-50/50">
            <div className="text-2xs uppercase tracking-wider font-bold text-zinc-600 mb-2 font-mono flex items-center justify-between">
              <span>收款渠道占比 (Payment Channels)</span>
              <span>100%</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <QrCode className="h-3.5 w-3.5 text-zinc-500" />
                  <span>DuitNow QR:</span>
                </span>
                <span className="font-bold text-zinc-950">
                  {formatPrice(statement.paymentChannels.qrCents, currSym)}
                  <span className="text-2xs text-zinc-500 font-normal ml-1">
                    ({statement.paymentChannels.qrCount} 笔)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <Banknote className="h-3.5 w-3.5 text-zinc-500" />
                  <span>现金 (Cash):</span>
                </span>
                <span className="font-bold text-zinc-950">
                  {formatPrice(statement.paymentChannels.cashCents, currSym)}
                  <span className="text-2xs text-zinc-500 font-normal ml-1">
                    ({statement.paymentChannels.cashCount} 笔)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                  <span>刷卡 (Card):</span>
                </span>
                <span className="font-bold text-zinc-950">
                  {formatPrice(statement.paymentChannels.cardCents, currSym)}
                  <span className="text-2xs text-zinc-500 font-normal ml-1">
                    ({statement.paymentChannels.cardCount} 笔)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Top Services Breakdown */}
          <div className="p-3.5 rounded-xl border border-zinc-300 bg-zinc-50/50">
            <div className="text-2xs uppercase tracking-wider font-bold text-zinc-600 mb-2 font-mono flex items-center justify-between">
              <span>主要服务销量 (Top Services)</span>
              <span>{statement.topServices.length} 项</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              {statement.topServices.slice(0, 3).map((svc) => (
                <div key={svc.serviceName} className="flex items-center justify-between">
                  <span className="text-zinc-800 font-sans truncate pr-2">
                    {svc.serviceName}
                  </span>
                  <span className="font-bold text-zinc-950 shrink-0">
                    {svc.count} 次 · {formatPrice(svc.totalCents, currSym)}
                  </span>
                </div>
              ))}
              {statement.topServices.length === 0 && (
                <div className="text-zinc-400 text-2xs italic">无服务销售记录</div>
              )}
            </div>
          </div>
        </div>

        {/* ITEMISED TRANSACTION LEDGER TABLE */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest font-bold text-zinc-600 mb-2 font-mono">
            <span>2. ITEMISED TRANSACTION LEDGER (交易明细流水)</span>
            <span>共 {statement.transactions.length} 笔记录</span>
          </div>

          <div className="border border-zinc-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-2xs uppercase font-mono text-zinc-700">
                  <th className="py-2.5 px-3 font-bold">日期时间</th>
                  <th className="py-2.5 px-2 font-bold">单号</th>
                  <th className="py-2.5 px-3 font-bold">顾客</th>
                  <th className="py-2.5 px-2 font-bold">类型</th>
                  <th className="py-2.5 px-3 font-bold">服务项目</th>
                  <th className="py-2.5 px-2 font-bold text-center">支付</th>
                  <th className="py-2.5 px-3 font-bold text-right">金额 ({currSym})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {statement.transactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`text-zinc-800 font-mono text-xs ${
                      idx % 2 === 1 ? "bg-zinc-50/50" : "bg-white"
                    } hover:bg-zinc-100/50 transition-colors`}
                  >
                    <td className="py-2 px-3 whitespace-nowrap text-zinc-600">
                      {tx.dateStr.slice(5)} {tx.timeStr}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap font-semibold text-zinc-900">
                      {tx.referenceCode}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-sans text-zinc-900 font-medium">
                      {tx.customerName}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap text-2xs text-zinc-500 font-sans">
                      {tx.isWalkin ? "散客" : "预约"}
                    </td>
                    <td className="py-2 px-3 font-sans text-zinc-700 truncate max-w-[180px]">
                      {tx.services}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap text-center text-2xs">
                      <span className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-100 text-zinc-700 font-mono">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-zinc-950 whitespace-nowrap">
                      {(tx.amountCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {statement.transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 italic font-sans">
                      本月暂无已完成交易记录 (No transactions recorded for this month)
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100/80 border-t-2 border-zinc-900 font-bold font-mono text-zinc-900">
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-xs">
                    本月销售合计 (TOTAL SALES REVENUE):
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm">
                    {grossSalesFormatted}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* STATEMENT FOOTER & LEGAL DISCLAIMER */}
        <div className="border-t border-zinc-300 pt-4 text-2xs text-zinc-500 space-y-1.5 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <span className="uppercase font-bold tracking-wider text-zinc-600">
              CONFIDENTIAL · FOR INTERNAL BUSINESS, TAX COMPLIANCE & ACCOUNTING ONLY
            </span>
            <span>END OF STATEMENT · PAGE 1</span>
          </div>
          <p className="leading-relaxed text-zinc-400 text-[10px]">
            This monthly business ledger statement is generated automatically from salon sales and appointment data.
            Please inspect and cross-verify with your merchant bank statements.
          </p>
        </div>
      </div>
    </div>
  );
}
