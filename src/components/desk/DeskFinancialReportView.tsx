"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getMonthlyFinancialReport,
  createBatchDeskExpenses,
  deleteDeskExpense,
} from "@/actions/desk";
import type {
  MonthlyFinancialReportDto,
  ExpenseCategory,
  DeskLanguageMode,
} from "@/types";
import { formatPrice, toBusinessDateString } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Plus,
  Trash2,
  Package,
  Building2,
  Lightbulb,
  User,
  Megaphone,
  CalendarDays,
  Loader2,
  AlertCircle,
  Scissors,
  CheckCircle2,
  X,
  Download,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { resolveServiceName } from "@/lib/desk-i18n";

interface DeskFinancialReportViewProps {
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
  onBack?: () => void;
}

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { zh: string; en: string; icon: React.ComponentType<{ className?: string }> }
> = {
  STOCK: { en: "Stock / Supplies", zh: "进货库存", icon: Package },
  RENT: { en: "Shop Rent", zh: "店面租金", icon: Building2 },
  UTILITIES: { en: "Utilities", zh: "水电杂费", icon: Lightbulb },
  SALARY: { en: "Salary / Commission", zh: "员工薪资", icon: User },
  MARKETING: { en: "Marketing", zh: "推广广告", icon: Megaphone },
  OTHER: { en: "Other", zh: "其他开支", icon: Receipt },
};

function resolveExpenseTitle(
  title: string,
  category: ExpenseCategory,
  isZh: boolean
): { title: string; isStandard: boolean } {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.OTHER;
  const trimmed = title?.trim() || "";

  const isStandard =
    !trimmed ||
    trimmed === cfg.en ||
    trimmed === cfg.zh ||
    trimmed === "Other Misc" ||
    trimmed === "员工薪资/提成" ||
    trimmed === "其他杂费";

  if (isStandard) {
    return { title: isZh ? cfg.zh : cfg.en, isStandard: true };
  }

  return { title: trimmed, isStandard: false };
}

interface ExtraRowItem {
  id: string;
  category: ExpenseCategory;
  title: string;
  amountStr: string;
}

const INITIAL_CATEGORY_INPUTS: Record<ExpenseCategory, { amountStr: string; title: string }> = {
  STOCK: { amountStr: "", title: "" },
  RENT: { amountStr: "", title: "" },
  UTILITIES: { amountStr: "", title: "" },
  SALARY: { amountStr: "", title: "" },
  MARKETING: { amountStr: "", title: "" },
  OTHER: { amountStr: "", title: "" },
};

export function DeskFinancialReportView({
  currencySymbol = "RM",
  languageMode = "ONLY_EN",
  onBack,
}: DeskFinancialReportViewProps) {
  const isZh = languageMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [reportData, setReportData] = useState<MonthlyFinancialReportDto | null>(null);
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "SALES" | "DAILY">("EXPENSES");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [sheetDateStr, setSheetDateStr] = useState<string>(
    toBusinessDateString(new Date())
  );
  const [categoryInputs, setCategoryInputs] = useState<
    Record<ExpenseCategory, { amountStr: string; title: string }>
  >(INITIAL_CATEGORY_INPUTS);
  const [extraCustomRows, setExtraCustomRows] = useState<ExtraRowItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getMonthlyFinancialReport(selectedYear, selectedMonth).then((res) => {
      if (ignore) return;
      if (res.success) {
        setReportData(res.data);
      }
      setIsLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [selectedYear, selectedMonth, refreshTick]);

  function handlePrevMonth() {
    setIsLoading(true);
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    setIsLoading(true);
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  }

  function handleCurrentMonth() {
    if (selectedYear === currentYear && selectedMonth === currentMonth) return;
    setIsLoading(true);
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  }

  function handleOpenModal() {
    setFormError(null);
    const isCurrentMonthView =
      selectedYear === currentYear && selectedMonth === currentMonth;
    const defaultDateStr = isCurrentMonthView
      ? toBusinessDateString(new Date())
      : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;

    setSheetDateStr(defaultDateStr);
    setCategoryInputs(INITIAL_CATEGORY_INPUTS);
    setExtraCustomRows([]);
    setIsLogOpen(true);
  }

  function handleCategoryChange(
    cat: ExpenseCategory,
    field: "amountStr" | "title",
    value: string
  ) {
    setCategoryInputs((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [field]: value },
    }));
  }

  function handleClearCategory(cat: ExpenseCategory) {
    setCategoryInputs((prev) => ({
      ...prev,
      [cat]: { amountStr: "", title: "" },
    }));
  }

  function handleAddExtraRow() {
    setExtraCustomRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        category: "STOCK",
        amountStr: "",
        title: "",
      },
    ]);
  }

  function handleUpdateExtraRow(
    id: string,
    field: keyof ExtraRowItem,
    value: string
  ) {
    setExtraCustomRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function handleRemoveExtraRow(id: string) {
    setExtraCustomRows((prev) => prev.filter((r) => r.id !== id));
  }

  const filledStandardItems = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[])
    .filter((cat) => {
      const parsed = parseFloat(categoryInputs[cat].amountStr);
      return !isNaN(parsed) && parsed > 0;
    })
    .map((cat) => ({
      category: cat,
      amountCents: Math.round(parseFloat(categoryInputs[cat].amountStr) * 100),
      title: categoryInputs[cat].title.trim(),
    }));

  const filledExtraItems = extraCustomRows
    .filter((r) => {
      const parsed = parseFloat(r.amountStr);
      return !isNaN(parsed) && parsed > 0;
    })
    .map((r) => ({
      category: r.category,
      amountCents: Math.round(parseFloat(r.amountStr) * 100),
      title: r.title.trim(),
    }));

  const allFilledItems = [...filledStandardItems, ...filledExtraItems];
  const totalEnteredCents = allFilledItems.reduce((sum, item) => sum + item.amountCents, 0);
  const totalItemCount = allFilledItems.length;

  function handleSaveAllExpenses() {
    setFormError(null);

    for (const item of allFilledItems) {
      if (item.category === "OTHER" && !item.title) {
        setFormError(t("Please enter a description for Other expenses.", "请为其他开支填写说明。"));
        return;
      }
    }

    if (allFilledItems.length === 0) {
      setFormError(t("Enter at least one amount.", "请至少填写一项金额。"));
      return;
    }

    startTransition(async () => {
      const itemsToSave = allFilledItems.map((it) => ({
        category: it.category,
        title: it.title || undefined,
        amountCents: it.amountCents,
        dateStr: sheetDateStr,
      }));

      const res = await createBatchDeskExpenses(itemsToSave);
      if (res.success) {
        setIsLogOpen(false);
        setIsLoading(true);
        setRefreshTick((n) => n + 1);
        toast.success(t("Expenses saved.", "开支已保存。"));
      } else {
        setFormError(res.error);
      }
    });
  }

  function handleConfirmDeleteExpense() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      const res = await deleteDeskExpense(deleteTargetId);
      if (res.success) {
        setDeleteTargetId(null);
        setIsLoading(true);
        setRefreshTick((n) => n + 1);
        toast.success(t("Expense deleted.", "已删除开支。"));
      } else {
        toast.error(res.error || t("Failed to delete expense.", "删除失败。"));
      }
    });
  }

  function handleExportMonthCsv() {
    try {
      const link = document.createElement("a");
      link.href = `/api/admin/export-sales?year=${selectedYear}&month=${selectedMonth}`;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("Exporting sales CSV…", "正在导出销售 CSV…"));
    } catch {
      toast.error(t("Export failed.", "导出失败。"));
    }
  }

  const currSym = reportData?.currencySymbol || currencySymbol;
  const isNetPositive = (reportData?.netProfitCents || 0) >= 0;

  return (
    <div className="space-y-5 select-none">
      {/* Compact Top Action Bar */}
      <div className={`flex flex-wrap items-center gap-2 ${onBack ? "justify-between" : "justify-end"}`}>
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            size="sm"
            variant="outline"
            className="h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{t("Back", "返回")}</span>
          </Button>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            onClick={handleExportMonthCsv}
            size="sm"
            variant="outline"
            className="h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{t("Export CSV", "导出 CSV")}</span>
          </Button>

          <Link
            href={`/admin/reports?year=${selectedYear}&month=${selectedMonth}&from=desk`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-9 px-3 rounded-lg font-semibold gap-1.5 cursor-pointer text-xs sm:text-sm",
            })}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>{t("Statement", "月度对账单")}</span>
          </Link>

          <Button
            type="button"
            onClick={handleOpenModal}
            size="sm"
            className="h-9 px-3.5 rounded-lg font-semibold gap-1.5 cursor-pointer text-xs sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>{t("Log Expense", "记录开支")}</span>
          </Button>
        </div>
      </div>

      {/* Title & Month Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("Monthly Financials", "月度收支")}
        </h1>

        <div className="inline-flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-lg cursor-pointer"
            title={t("Previous month", "上个月")}
            aria-label={t("Previous month", "上个月")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="font-semibold text-sm px-2.5 text-foreground tabular-nums whitespace-nowrap">
            {selectedYear} / {String(selectedMonth).padStart(2, "0")}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-lg cursor-pointer"
            title={t("Next month", "下个月")}
            aria-label={t("Next month", "下个月")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCurrentMonth}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            {t("This Month", "本月")}
          </Button>
        </div>
      </div>

      {/* Unified 1px-Divided KPI Strip */}
      <div className="rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground block">
            {t("Gross Revenue", "营业总额")}
          </span>
          <div className="text-2xl font-bold text-foreground mt-1 tabular-nums whitespace-nowrap">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50 my-1" />
            ) : (
              formatPrice(reportData?.grossSalesCents || 0, currSym)
            )}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums">
            {reportData?.completedOrdersCount || 0} {t("orders", "笔")}
          </span>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground block">
            {t("Expenses", "店铺开支")}
          </span>
          <div className="text-2xl font-bold text-foreground mt-1 tabular-nums whitespace-nowrap">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50 my-1" />
            ) : (
              formatPrice(reportData?.totalExpensesCents || 0, currSym)
            )}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums">
            {reportData?.expenseCount || 0} {t("entries", "笔")}
          </span>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground block">
            {t("Net Profit", "净利润")}
          </span>
          <div
            className={`text-2xl font-bold mt-1 tabular-nums whitespace-nowrap ${
              isNetPositive ? "text-primary" : "text-destructive"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50 my-1" />
            ) : (
              <>
                {isNetPositive ? "+" : "−"}
                {formatPrice(Math.abs(reportData?.netProfitCents || 0), currSym)}
              </>
            )}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5 tabular-nums">
            {reportData?.profitMarginPercent || 0}% {t("margin", "利润率")}
          </span>
        </div>
      </div>

      {/* Segmented View Tabs (Fits cleanly without clipping) */}
      <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
        {[
          {
            id: "EXPENSES" as const,
            label: t("Expenses", "开支记录"),
            count: reportData?.expenses.length || 0,
            icon: Receipt,
          },
          {
            id: "SALES" as const,
            label: t("Services", "服务销量"),
            count: reportData?.servicesBreakdown.length || 0,
            icon: Scissors,
          },
          {
            id: "DAILY" as const,
            label: t("Daily", "每日明细"),
            count: null,
            icon: CalendarDays,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                active
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="text-[11px] text-muted-foreground tabular-nums">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === "EXPENSES" && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {!reportData || reportData.expenses.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t("No expenses logged this month", "本月暂无开支记录")}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenModal}
                className="font-semibold rounded-lg gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("Log Expense", "记录开支")}</span>
              </Button>
            </div>
          ) : (
            reportData.expenses.map((expense) => {
              const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.OTHER;
              const CatIcon = config.icon;
              const resolved = resolveExpenseTitle(expense.title, expense.category, isZh);
              const catLabel = isZh ? config.zh : config.en;

              return (
                <div
                  key={expense.id}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {resolved.title}
                        </span>
                        {!resolved.isStandard && (
                          <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {catLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums flex items-center gap-2">
                        <span>{expense.dateStr}</span>
                        {expense.notes && <span className="truncate">· {expense.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-sm text-foreground tabular-nums">
                      {formatPrice(expense.amountCents, currSym)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => setDeleteTargetId(expense.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      aria-label={t("Delete expense", "删除记录")}
                      title={t("Delete", "删除")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SERVICE SALES */}
      {activeTab === "SALES" && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {!reportData || reportData.servicesBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("No sales recorded this month", "本月暂无服务销售")}
            </div>
          ) : (
            reportData.servicesBreakdown.map((svc) => {
              const svcResolved = resolveServiceName(svc.serviceName, languageMode);
              const pctOfTotal =
                reportData.grossSalesCents > 0
                  ? Math.round((svc.totalCents / reportData.grossSalesCents) * 1000) / 10
                  : 0;
              return (
                <div
                  key={svc.serviceId}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {svcResolved.primary}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {svc.category || t("General", "常规")} · {svc.count} {t("orders", "次")}
                    </p>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <span className="font-semibold text-sm text-foreground block">
                      {formatPrice(svc.totalCents, currSym)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{pctOfTotal}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: DAILY BREAKDOWN */}
      {activeTab === "DAILY" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4">{t("Date", "日期")}</th>
                  <th className="py-2.5 px-4 text-center">{t("Orders", "订单")}</th>
                  <th className="py-2.5 px-4 text-right">{t("Revenue", "营收")}</th>
                  <th className="py-2.5 px-4 text-right">{t("Expenses", "开支")}</th>
                  <th className="py-2.5 px-4 text-right">{t("Net", "净利")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {reportData?.dailyBreakdown
                  .filter((d) => d.salesCents > 0 || d.expenseCents > 0)
                  .map((day) => {
                    const isPositive = day.netProfitCents >= 0;
                    return (
                      <tr key={day.dateStr} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                          {day.dateStr}
                        </td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">
                          {day.ordersCount}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-right text-foreground whitespace-nowrap">
                          {formatPrice(day.salesCents, currSym)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                          {day.expenseCents > 0 ? formatPrice(day.expenseCents, currSym) : "—"}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-semibold text-right whitespace-nowrap ${
                            isPositive ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {isPositive ? "+" : "−"}
                          {formatPrice(Math.abs(day.netProfitCents), currSym)}
                        </td>
                      </tr>
                    );
                  })}
                {(!reportData ||
                  reportData.dailyBreakdown.every(
                    (d) => d.salesCents === 0 && d.expenseCents === 0
                  )) && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t("No activity this month", "本月暂无记录")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Category Expense Modal */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-xl p-5 sm:p-6 select-none max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
              <DialogTitle className="text-base sm:text-lg font-bold">
                {t("Log Expenses", "记录开支")}
              </DialogTitle>
              <Input
                type="date"
                value={sheetDateStr}
                onChange={(e) => setSheetDateStr(e.target.value)}
                className="h-9 w-36 text-xs font-medium rounded-lg"
              />
            </div>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2 border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((catKey) => {
              const cfg = CATEGORY_CONFIG[catKey];
              const CatIcon = cfg.icon;
              const isOther = catKey === "OTHER";
              const currentInput = categoryInputs[catKey];
              const hasAmount = Boolean(
                currentInput.amountStr && parseFloat(currentInput.amountStr) > 0
              );

              return (
                <div
                  key={catKey}
                  className={`p-3 rounded-xl border transition-colors ${
                    hasAmount
                      ? "border-primary bg-primary/[0.03]"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex items-center gap-2 sm:w-40 shrink-0">
                      <CatIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Label className="text-xs font-semibold text-foreground">
                        {isZh ? cfg.zh : cfg.en}
                        {isOther ? " *" : ""}
                      </Label>
                    </div>

                    <div className="relative flex-1 sm:max-w-[160px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground text-xs">
                        {currSym}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={currentInput.amountStr}
                        onChange={(e) =>
                          handleCategoryChange(catKey, "amountStr", e.target.value)
                        }
                        className="h-9 pl-9 pr-7 text-base sm:text-sm font-semibold rounded-lg tabular-nums bg-background"
                      />
                      {currentInput.amountStr && (
                        <button
                          type="button"
                          onClick={() => handleClearCategory(catKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                          aria-label={t("Clear amount", "清空")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <Input
                      placeholder={isOther ? t("Required note", "必填说明") : t("Note (optional)", "备注 (选填)")}
                      value={currentInput.title}
                      onChange={(e) =>
                        handleCategoryChange(catKey, "title", e.target.value)
                      }
                      className="h-9 flex-1 text-base sm:text-sm rounded-lg bg-background"
                    />
                  </div>
                </div>
              );
            })}

            {extraCustomRows.map((row, idx) => (
              <div
                key={row.id}
                className="p-3 rounded-xl border border-dashed border-border bg-card space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-muted-foreground">
                  <span>{t(`Extra Item #${idx + 1}`, `额外开支 #${idx + 1}`)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraRow(row.id)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer p-1"
                    aria-label={t("Remove row", "删除行")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={row.category}
                    onChange={(e) =>
                      handleUpdateExtraRow(
                        row.id,
                        "category",
                        e.target.value as ExpenseCategory
                      )
                    }
                    className="h-9 rounded-lg border border-input px-2 text-xs font-medium bg-background"
                  >
                    {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cKey) => (
                      <option key={cKey} value={cKey}>
                        {isZh ? CATEGORY_CONFIG[cKey].zh : CATEGORY_CONFIG[cKey].en}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-medium text-muted-foreground text-xs">
                      {currSym}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={row.amountStr}
                      onChange={(e) =>
                        handleUpdateExtraRow(row.id, "amountStr", e.target.value)
                      }
                      className="h-9 pl-8 text-base sm:text-sm font-semibold rounded-lg tabular-nums"
                    />
                  </div>

                  <Input
                    placeholder={t("Note", "说明")}
                    value={row.title}
                    onChange={(e) =>
                      handleUpdateExtraRow(row.id, "title", e.target.value)
                    }
                    className="h-9 text-base sm:text-sm rounded-lg"
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddExtraRow}
              className="w-full h-9 rounded-lg font-semibold text-xs gap-1.5 border-dashed cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("Add Another Line", "添加一行")}</span>
            </Button>
          </div>

          <div className="pt-3 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground block">
                {totalItemCount > 0
                  ? t(`${totalItemCount} item(s)`, `共 ${totalItemCount} 项`)
                  : t("Total", "合计")}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {formatPrice(totalEnteredCents, currSym)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsLogOpen(false)}
                className="h-9 px-3 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {t("Cancel", "取消")}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || totalItemCount === 0}
                onClick={handleSaveAllExpenses}
                className="h-9 px-4 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>
                  {totalItemCount > 0
                    ? t(`Save (${totalItemCount})`, `保存 (${totalItemCount})`)
                    : t("Save", "保存")}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>{t("Delete Expense?", "删除开支记录？")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "This permanently removes the expense entry.",
                "确认永久删除此开支记录？此操作无法撤销。"
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              disabled={isPending}
            >
              {t("Cancel", "取消")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmDeleteExpense}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("Delete", "删除")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
