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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Plus,
  Trash2,
  Wallet,
  Package,
  CalendarDays,
  Loader2,
  AlertCircle,
  Scissors,
  CheckCircle2,
  X,
} from "lucide-react";
import { DESK_DICT, resolveDeskText, resolveServiceName } from "@/lib/desk-i18n";
import { DeskText } from "./DeskText";

interface DeskFinancialReportViewProps {
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
  onBack: () => void;
}

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { zh: string; en: string; icon: string }
> = {
  STOCK: { zh: "进货库存", en: "Stock / Supplies", icon: "📦" },
  RENT: { zh: "店面租金", en: "Shop Rent", icon: "🏢" },
  UTILITIES: { zh: "水电杂费", en: "Utilities", icon: "💡" },
  SALARY: { zh: "员工薪资/提成", en: "Salary / Commission", icon: "👤" },
  MARKETING: { zh: "推广广告", en: "Marketing", icon: "📣" },
  OTHER: { zh: "其他杂费", en: "Other Misc", icon: "🧾" },
};

/**
 * Resolves expense titles: standard category titles are translated dynamically
 * based on current languageMode so English users see English, Chinese users see Chinese.
 */
function resolveExpenseTitle(
  title: string,
  category: ExpenseCategory,
  languageMode: DeskLanguageMode
): { title: string; isStandard: boolean } {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.OTHER;
  const trimmed = title?.trim() || "";

  const isStandard =
    !trimmed ||
    trimmed === cfg.en ||
    trimmed === cfg.zh ||
    trimmed === "Stock / Supplies" ||
    trimmed === "Shop Rent" ||
    trimmed === "Utilities" ||
    trimmed === "Salary / Commission" ||
    trimmed === "Marketing" ||
    trimmed === "Other Misc" ||
    trimmed === "进货库存" ||
    trimmed === "店面租金" ||
    trimmed === "水电杂费" ||
    trimmed === "员工薪资" ||
    trimmed === "员工薪资/提成" ||
    trimmed === "推广广告" ||
    trimmed === "其他杂费";

  if (isStandard) {
    return {
      title: resolveDeskText({ zh: cfg.zh, en: cfg.en }, languageMode).primary,
      isStandard: true,
    };
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
  languageMode = "BILINGUAL_ZH_FIRST",
  onBack,
}: DeskFinancialReportViewProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [reportData, setReportData] = useState<MonthlyFinancialReportDto | null>(null);
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "SALES" | "DAILY">("EXPENSES");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Multi-Category Sheet State
  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [sheetDateStr, setSheetDateStr] = useState<string>(
    toBusinessDateString(new Date())
  );
  const [categoryInputs, setCategoryInputs] = useState<
    Record<ExpenseCategory, { amountStr: string; title: string }>
  >(INITIAL_CATEGORY_INPUTS);
  const [extraCustomRows, setExtraCustomRows] = useState<ExtraRowItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch report data for selected year & month
  function fetchReport(year: number, month: number) {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getMonthlyFinancialReport(year, month);
      if (res.success) {
        setReportData(res.data);
      }
      setIsLoading(false);
    });
  }

  useEffect(() => {
    fetchReport(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  }

  function handleCurrentMonth() {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  }

  // Open modal handler: smartly defaults date to 1st of selected month (or today if current month)
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

  // Update a standard category input
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

  // Clear single category
  function handleClearCategory(cat: ExpenseCategory) {
    setCategoryInputs((prev) => ({
      ...prev,
      [cat]: { amountStr: "", title: "" },
    }));
  }

  // Add extra custom row
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

  // Update extra row
  function handleUpdateExtraRow(
    id: string,
    field: keyof ExtraRowItem,
    value: string
  ) {
    setExtraCustomRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  // Remove extra row
  function handleRemoveExtraRow(id: string) {
    setExtraCustomRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Calculate live filled items
  const filledStandardItems = (
    Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]
  )
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

  // Save all entered expenses at once
  function handleSaveAllExpenses() {
    setFormError(null);

    // Validate: if OTHER is filled, description is required
    for (const item of allFilledItems) {
      if (item.category === "OTHER" && !item.title) {
        setFormError(
          resolveDeskText(
            {
              zh: "填写“其他杂费”时必须输入具体说明",
              en: "Please enter description for Other Misc expense.",
            },
            languageMode
          ).primary
        );
        return;
      }
    }

    if (allFilledItems.length === 0) {
      setFormError(
        resolveDeskText(
          {
            zh: "请在任意支出分类中输入至少一笔金额",
            en: "Please enter at least one expense amount.",
          },
          languageMode
        ).primary
      );
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
        fetchReport(selectedYear, selectedMonth);
      } else {
        setFormError(res.error);
      }
    });
  }

  // Delete Expense from main report
  function handleDeleteExpense(id: string) {
    if (
      !confirm(
        resolveDeskText(
          {
            zh: "确定要删除这条支出记录吗？",
            en: "Are you sure you want to delete this expense record?",
          },
          languageMode
        ).primary
      )
    ) {
      return;
    }

    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteDeskExpense(id);
      if (res.success) {
        fetchReport(selectedYear, selectedMonth);
      }
      setDeletingId(null);
    });
  }

  const currSym = reportData?.currencySymbol || currencySymbol;
  const isNetPositive = (reportData?.netProfitCents || 0) >= 0;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto select-none">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4">
        <Button
          type="button"
          onClick={onBack}
          size="lg"
          variant="outline"
          className="h-14 sm:h-16 px-6 text-base sm:text-lg font-bold border border-border/80 bg-card hover:bg-muted text-foreground gap-2.5 rounded-2xl shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-6 w-6 text-foreground shrink-0" />
          <DeskText
            text={DESK_DICT.financialReport.backToDesk}
            mode={languageMode}
            layout="inline"
            primaryClass="font-black text-base sm:text-lg"
          />
        </Button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            onClick={handleOpenModal}
            size="lg"
            className="h-14 sm:h-16 px-6 text-base sm:text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-2xl shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-5 w-5" />
            <DeskText
              text={DESK_DICT.financialReport.logExpenseBtn}
              mode={languageMode}
              layout="inline"
              primaryClass="font-extrabold text-base sm:text-lg"
            />
          </Button>
        </div>
      </div>

      {/* Title & Month Selector Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <DeskText
            text={DESK_DICT.financialReport.title}
            mode={languageMode}
            layout="stack"
            primaryClass="text-2xl sm:text-3xl font-black tracking-tight text-foreground"
            secondaryClass="text-sm font-semibold text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            {resolveDeskText(DESK_DICT.financialReport.subtitle, languageMode).primary}
          </p>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center gap-1.5 bg-card border border-border/80 p-1.5 rounded-2xl shadow-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-10 w-10 p-0 rounded-xl hover:bg-muted cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="font-extrabold text-base px-3 text-foreground font-mono">
            {selectedYear} / {String(selectedMonth).padStart(2, "0")}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-10 w-10 p-0 rounded-xl hover:bg-muted cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            className="h-9 px-3 rounded-xl text-xs font-bold border border-border/80 hover:bg-muted ml-1 cursor-pointer"
          >
            <DeskText
              text={DESK_DICT.financialReport.thisMonthBtn}
              mode={languageMode}
              layout="badge"
            />
          </Button>
        </div>
      </div>

      {/* TOP 3 KPI CARDS - Direction 2 Retail POS Tactile Clean */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Gross Sales */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <DeskText
                  text={DESK_DICT.financialReport.kpiGrossSales}
                  mode={languageMode}
                  layout="inline"
                  primaryClass="font-bold text-xs text-foreground tracking-tight"
                />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                {reportData?.completedOrdersCount || 0}{" "}
                {resolveDeskText(DESK_DICT.financialReport.kpiOrdersCount, languageMode).primary}
              </span>
            </div>

            <div className="pt-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                ) : (
                  formatPrice(reportData?.grossSalesCents || 0, currSym)
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{reportData?.monthLabel || ""}</span>
            </span>
            <span className="text-muted-foreground font-semibold">
              + 100% {resolveDeskText({ zh: "收入", en: "Income" }, languageMode).primary}
            </span>
          </div>
        </Card>

        {/* Card 2: Total Expenses */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4" />
                </div>
                <DeskText
                  text={DESK_DICT.financialReport.kpiTotalExpenses}
                  mode={languageMode}
                  layout="inline"
                  primaryClass="font-bold text-xs text-foreground tracking-tight"
                />
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                {reportData?.expenseCount || 0}{" "}
                {resolveDeskText(DESK_DICT.financialReport.kpiExpenseCount, languageMode).primary}
              </span>
            </div>

            <div className="pt-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground tabular-nums">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                ) : (
                  formatPrice(reportData?.totalExpensesCents || 0, currSym)
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>
                {reportData?.expenseCategories.length || 0}{" "}
                {resolveDeskText({ zh: "类开销", en: "Categories" }, languageMode).primary}
              </span>
            </span>
            <span className="text-amber-700 font-semibold">
              − {resolveDeskText({ zh: "进货/杂支", en: "Cost Outflow" }, languageMode).primary}
            </span>
          </div>
        </Card>

        {/* Card 3: Net Profit */}
        <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between">
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              isNetPositive ? "bg-emerald-600" : "bg-destructive"
            }`}
          />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isNetPositive
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <DeskText
                  text={DESK_DICT.financialReport.kpiNetProfit}
                  mode={languageMode}
                  layout="inline"
                  primaryClass="font-bold text-xs text-foreground tracking-tight"
                />
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                  isNetPositive
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {reportData?.profitMarginPercent || 0}%{" "}
                {resolveDeskText(DESK_DICT.financialReport.kpiMargin, languageMode).primary}
              </span>
            </div>

            <div className="pt-2">
              <div
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums ${
                  isNetPositive ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                ) : (
                  <>
                    {isNetPositive ? "+" : "−"}
                    {formatPrice(Math.abs(reportData?.netProfitCents || 0), currSym)}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isNetPositive ? "bg-emerald-500" : "bg-destructive"
                }`}
              />
              <span>
                {resolveDeskText({ zh: "营业额 − 支出", en: "Sales − Expenses" }, languageMode).primary}
              </span>
            </span>
            <span
              className={`font-mono font-bold ${
                isNetPositive ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {
                resolveDeskText(
                  isNetPositive
                    ? { zh: "✓ 盈利", en: "✓ Profit" }
                    : { zh: "⚠ 亏损", en: "⚠ Loss" },
                  languageMode
                ).primary
              }
            </span>
          </div>
        </Card>
      </div>

      {/* Expense Category Breakdown Pills */}
      {/* {reportData && reportData.expenseCategories.length > 0 && (
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {resolveDeskText({ zh: "支出分类占比", en: "Expense Allocation" }, languageMode).primary}
            </span>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {formatPrice(reportData.totalExpensesCents, currSym)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {reportData.expenseCategories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 text-xs"
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="font-bold text-foreground">
                  {languageMode === "ONLY_ZH"
                    ? cat.labelZh
                    : languageMode === "ONLY_EN"
                    ? cat.labelEn
                    : `${cat.labelZh} (${cat.labelEn})`}
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  {formatPrice(cat.totalCents, currSym)}
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {cat.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("EXPENSES")}
          className={`pb-3 px-4 text-sm sm:text-base font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "EXPENSES"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <DeskText
            text={DESK_DICT.financialReport.tabExpenses}
            mode={languageMode}
            layout="inline"
            primaryClass="font-bold"
          />
          <Badge variant="outline" className="text-xs font-mono py-0 px-1.5 ml-1">
            {reportData?.expenses.length || 0}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SALES")}
          className={`pb-3 px-4 text-sm sm:text-base font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "SALES"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scissors className="h-4 w-4" />
          <DeskText
            text={DESK_DICT.financialReport.tabSales}
            mode={languageMode}
            layout="inline"
            primaryClass="font-bold"
          />
          <Badge variant="outline" className="text-xs font-mono py-0 px-1.5 ml-1">
            {reportData?.servicesBreakdown.length || 0}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DAILY")}
          className={`pb-3 px-4 text-sm sm:text-base font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "DAILY"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <DeskText
            text={DESK_DICT.financialReport.tabDaily}
            mode={languageMode}
            layout="inline"
            primaryClass="font-bold"
          />
        </button>
      </div>

      {/* TAB CONTENT 1: EXPENSE LIST */}
      {activeTab === "EXPENSES" && (
        <div className="space-y-3">
          {reportData?.expenses.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">
                <DeskText
                  text={DESK_DICT.financialReport.noExpensesYet}
                  mode={languageMode}
                  layout="inline"
                />
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {resolveDeskText(
                  {
                    zh: "同时输入多项开销，系统自动核算营业额与纯利润",
                    en: "Enter multiple expenses at once to calculate net profit",
                  },
                  languageMode
                ).primary}
              </p>
              <Button
                type="button"
                onClick={handleOpenModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <DeskText
                  text={DESK_DICT.financialReport.logExpenseBtn}
                  mode={languageMode}
                  layout="inline"
                />
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {reportData?.expenses.map((expense) => {
                const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.OTHER;
                const isDeleting = deletingId === expense.id;
                return (
                  <div
                    key={expense.id}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-all flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-muted/80 text-foreground flex items-center justify-center text-xl shrink-0 border border-border/50">
                        {config.icon}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                      {(() => {
                        const resolved = resolveExpenseTitle(
                          expense.title,
                          expense.category,
                          languageMode
                        );
                        const catLabel = resolveDeskText(
                          { zh: config.zh, en: config.en },
                          languageMode
                        ).primary;

                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base text-foreground leading-tight truncate">
                              {resolved.title}
                            </span>
                            {!resolved.isStandard && (
                              <span className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                                {catLabel}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{expense.dateStr}</span>
                          {expense.notes && (
                            <span className="truncate italic max-w-xs">
                              • {expense.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-black text-lg text-foreground tabular-nums">
                        {formatPrice(expense.amountCents, currSym)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting || isPending}
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title={
                          resolveDeskText(
                            { zh: "删除记录", en: "Delete expense" },
                            languageMode
                          ).primary
                        }
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: SERVICE REVENUE BREAKDOWN */}
      {activeTab === "SALES" && (
        <div className="space-y-3">
          {reportData?.servicesBreakdown.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <Scissors className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">
                <DeskText
                  text={DESK_DICT.financialReport.noSalesYet}
                  mode={languageMode}
                  layout="inline"
                />
              </h3>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {reportData?.servicesBreakdown.map((svc) => {
                const svcResolved = resolveServiceName(svc.serviceName, languageMode);
                const pctOfTotal =
                  reportData.grossSalesCents > 0
                    ? Math.round((svc.totalCents / reportData.grossSalesCents) * 1000) / 10
                    : 0;
                return (
                  <div
                    key={svc.serviceId}
                    className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <DeskText
                        zh={svcResolved.primary}
                        en={svcResolved.secondary}
                        mode={languageMode}
                        primaryClass="font-bold text-base text-foreground leading-tight truncate"
                        secondaryClass="text-xs text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground font-medium">
                        {svc.category || "General"} • {svc.count}{" "}
                        {resolveDeskText(DESK_DICT.breakdown.clientsUnit, languageMode).primary}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-base sm:text-lg text-foreground block tabular-nums">
                        {formatPrice(svc.totalCents, currSym)}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {pctOfTotal}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: DAILY P&L BREAKDOWN */}
      {activeTab === "DAILY" && (
        <Card className="border border-border/80 overflow-hidden rounded-2xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border/80 text-xs font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">
                    {resolveDeskText({ zh: "日期", en: "Date" }, languageMode).primary}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {resolveDeskText({ zh: "开单数", en: "Orders" }, languageMode).primary}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {resolveDeskText({ zh: "当日营业额", en: "Sales" }, languageMode).primary}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {resolveDeskText({ zh: "当日支出", en: "Expenses" }, languageMode).primary}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {resolveDeskText({ zh: "净收益", en: "Net Profit" }, languageMode).primary}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {reportData?.dailyBreakdown
                  .filter((d) => d.salesCents > 0 || d.expenseCents > 0)
                  .map((day) => {
                    const isPositive = day.netProfitCents >= 0;
                    return (
                      <tr key={day.dateStr} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          {day.dateStr}
                        </td>
                        <td className="py-3 px-4 font-mono text-center text-muted-foreground font-semibold">
                          {day.ordersCount}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-right text-foreground">
                          {formatPrice(day.salesCents, currSym)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-amber-700 font-semibold">
                          {day.expenseCents > 0
                            ? formatPrice(day.expenseCents, currSym)
                            : "—"}
                        </td>
                        <td
                          className={`py-3 px-4 font-mono font-black text-right ${
                            isPositive ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {isPositive ? "+" : "−"}
                          {formatPrice(Math.abs(day.netProfitCents), currSym)}
                        </td>
                      </tr>
                    );
                  })}
                {reportData?.dailyBreakdown.every(
                  (d) => d.salesCents === 0 && d.expenseCents === 0
                ) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground italic text-xs"
                    >
                      {resolveDeskText(
                        { zh: "本月暂无每日收支明细", en: "No daily records for this month yet" },
                        languageMode
                      ).primary}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ALL-IN-ONE MULTI-CATEGORY EXPENSE ENTRY MODAL */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl p-5 sm:p-6 select-none max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center border border-border/80">
                  <Receipt className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black">
                    <DeskText
                      text={DESK_DICT.financialReport.modalLogExpenseTitle}
                      mode={languageMode}
                      layout="inline"
                    />
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {resolveDeskText(
                      {
                        zh: "可同时在多个分类中输入金额，点击下方按钮一键保存全部：",
                        en: "Enter amounts for multiple categories at once and save together:",
                      },
                      languageMode
                    ).primary}
                  </DialogDescription>
                </div>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-xs font-bold text-muted-foreground hidden sm:inline">
                  {resolveDeskText(DESK_DICT.financialReport.expenseDateLabel, languageMode).primary}:
                </Label>
                <Input
                  type="date"
                  value={sheetDateStr}
                  onChange={(e) => setSheetDateStr(e.target.value)}
                  className="h-9 w-36 text-xs font-mono font-bold rounded-xl"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2 border border-destructive/20 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ALL CATEGORIES MULTI-INPUT GRID */}
          <div className="space-y-3 pt-1">
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((catKey) => {
              const cfg = CATEGORY_CONFIG[catKey];
              const isOther = catKey === "OTHER";
              const currentInput = categoryInputs[catKey];
              const hasAmount = Boolean(
                currentInput.amountStr && parseFloat(currentInput.amountStr) > 0
              );

              return (
                <div
                  key={catKey}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasAmount
                      ? "border-2 border-emerald-600/70 bg-card shadow-xs"
                      : "border-border/80 bg-muted/20 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Left: Category Label & Icon */}
                    <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
                      <span className="text-xl shrink-0">{cfg.icon}</span>
                      <div>
                        <span className="font-extrabold text-sm sm:text-base text-foreground block leading-tight">
                          {resolveDeskText({ zh: cfg.zh, en: cfg.en }, languageMode).primary}
                        </span>
                        {isOther ? (
                          <span className="text-[10px] text-destructive font-bold">
                            {resolveDeskText(
                              { zh: "* 填金额须写说明", en: "* Description required" },
                              languageMode
                            ).primary}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {resolveDeskText(
                              { zh: "选填说明 (可选)", en: "Optional description" },
                              languageMode
                            ).primary}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Amount Field */}
                    <div className="relative flex-1 sm:max-w-[190px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground text-sm">
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
                        className={`h-11 pl-9 pr-8 text-base font-mono font-black rounded-xl ${
                          hasAmount
                            ? "bg-card border-emerald-600 text-foreground"
                            : "bg-background"
                        }`}
                      />
                      {currentInput.amountStr && (
                        <button
                          type="button"
                          onClick={() => handleClearCategory(catKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md"
                          title="Clear amount"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Right: Optional description / note */}
                    <div className="flex-1">
                      <Input
                        placeholder={
                          isOther
                            ? resolveDeskText(
                                {
                                  zh: "具体杂费用途说明 (如: 维修水管)",
                                  en: "Specific description (e.g. Plumbing repair)",
                                },
                                languageMode
                              ).primary
                            : resolveDeskText(
                                {
                                  zh: `备注 (选填，留空默认“${cfg.zh}”)`,
                                  en: `Notes (optional, defaults to "${cfg.en}")`,
                                },
                                languageMode
                              ).primary
                        }
                        value={currentInput.title}
                        onChange={(e) =>
                          handleCategoryChange(catKey, "title", e.target.value)
                        }
                        className="h-11 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Extra Custom Lines */}
            {extraCustomRows.map((row, idx) => (
              <div
                key={row.id}
                className="p-3.5 rounded-2xl border border-dashed border-border bg-card space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-muted-foreground">
                  <span>
                    {resolveDeskText(
                      { zh: `额外支出行 #${idx + 1}`, en: `Custom Expense #${idx + 1}` },
                      languageMode
                    ).primary}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraRow(row.id)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer p-1"
                    title={resolveDeskText(
                      { zh: "删除行", en: "Remove row" },
                      languageMode
                    ).primary}
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
                    className="h-10 rounded-xl border px-2 text-xs font-semibold bg-background"
                  >
                    {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(
                      (cKey) => (
                        <option key={cKey} value={cKey}>
                          {CATEGORY_CONFIG[cKey].icon}{" "}
                          {resolveDeskText(
                            { zh: CATEGORY_CONFIG[cKey].zh, en: CATEGORY_CONFIG[cKey].en },
                            languageMode
                          ).primary}
                        </option>
                      )
                    )}
                  </select>

                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground text-xs">
                      {currSym}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={resolveDeskText(
                        { zh: "金额 (0.00)", en: "Amount (0.00)" },
                        languageMode
                      ).primary}
                      value={row.amountStr}
                      onChange={(e) =>
                        handleUpdateExtraRow(row.id, "amountStr", e.target.value)
                      }
                      className="h-10 pl-8 text-xs font-mono font-bold rounded-xl"
                    />
                  </div>

                  <Input
                    placeholder={resolveDeskText(
                      { zh: "说明 / 备注 (选填)", en: "Description / Notes (Optional)" },
                      languageMode
                    ).primary}
                    value={row.title}
                    onChange={(e) =>
                      handleUpdateExtraRow(row.id, "title", e.target.value)
                    }
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            ))}

            {/* Add Extra Custom Row Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddExtraRow}
              className="w-full h-11 rounded-xl font-bold text-xs gap-1.5 border-dashed hover:bg-muted cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>
                {resolveDeskText(
                  { zh: "+ 添加更多自定义行", en: "+ Add extra custom row" },
                  languageMode
                ).primary}
              </span>
            </Button>
          </div>

          {/* STICKY FOOTER: LIVE TOTAL & SAVE ALL */}
          <div className="pt-3 mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-semibold">
                {totalItemCount > 0 ? (
                  <span className="text-foreground font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {languageMode === "ONLY_EN" ? (
                      <>
                        <span className="font-mono text-emerald-600 text-sm">{totalItemCount}</span> expense item(s) filled:
                      </>
                    ) : languageMode === "ONLY_ZH" ? (
                      <>
                        已填写 <span className="font-mono text-emerald-600 text-sm">{totalItemCount}</span> 项支出：
                      </>
                    ) : (
                      <>
                        已填写 <span className="font-mono text-emerald-600 text-sm">{totalItemCount}</span> 项支出 ({totalItemCount} filled):
                      </>
                    )}
                  </span>
                ) : (
                  resolveDeskText(
                    {
                      zh: "在上方任意分类中输入金额即可同时录入",
                      en: "Enter amounts in any categories above to log together",
                    },
                    languageMode
                  ).primary
                )}
              </span>
              <div className="text-2xl font-black font-mono text-foreground tabular-nums">
                {formatPrice(totalEnteredCents, currSym)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setIsLogOpen(false)}
                className="h-12 px-4 text-xs sm:text-sm font-bold rounded-xl cursor-pointer"
              >
                <DeskText
                  text={DESK_DICT.appointmentView.cancel}
                  mode={languageMode}
                  layout="inline"
                />
              </Button>

              <Button
                type="button"
                disabled={isPending || totalItemCount === 0}
                onClick={handleSaveAllExpenses}
                className="h-12 px-6 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 cursor-pointer shadow-xs transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span>
                  {totalItemCount > 0
                    ? resolveDeskText(
                        {
                          zh: `✓ 一键保存全部 (${totalItemCount} 笔)`,
                          en: `✓ Save All (${totalItemCount} items)`,
                        },
                        languageMode
                      ).primary
                    : resolveDeskText(
                        {
                          zh: "请先输入金额",
                          en: "Enter amount first",
                        },
                        languageMode
                      ).primary}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
