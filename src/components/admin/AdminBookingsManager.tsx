"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  getAllBookings,
  updateBookingStatus,
  cancelBooking,
  type BookingsCountsSummary,
  type BookingTimeframe,
} from "@/actions/admin-bookings";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, cn } from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";
import type { BookingDto, BookingStatus } from "@/types";
import {
  Search,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Copy,
  Check,
  Loader2,
  CalendarDays,
  Clock,
  Phone,
  RotateCcw,
  Sparkles,
  Filter,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdminBookingsManagerProps {
  initialBookings: BookingDto[];
  initialCounts: BookingsCountsSummary;
  currencySymbol: string;
  initialStatus?: string;
  initialRef?: string;
  initialSearch?: string;
  initialTimeframe?: BookingTimeframe;
}

const STATUS_SELECT_OPTIONS: { id: BookingStatus; labelZh: string; labelEn: string }[] = [
  { id: "PENDING", labelZh: "待确认 (收据审核)", labelEn: "Pending" },
  { id: "CONFIRMED", labelZh: "已确认锁定", labelEn: "Confirmed" },
  { id: "COMPLETED", labelZh: "已服务完成", labelEn: "Completed" },
  { id: "NO_SHOW", labelZh: "未到店 (放飞机)", labelEn: "No-Show" },
  { id: "CANCELLED", labelZh: "已取消作废", labelEn: "Cancelled" },
];

export function AdminBookingsManager({
  initialBookings,
  initialCounts,
  currencySymbol = "RM",
  initialStatus,
  initialRef,
  initialSearch,
  initialTimeframe = "6_MONTHS",
}: AdminBookingsManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { langMode } = useDeskLanguage();

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialStatus && ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(initialStatus)) {
      return initialStatus;
    }
    return "ALL";
  });

  const [timeframe, setTimeframe] = useState<BookingTimeframe>(initialTimeframe);
  const [searchQuery, setSearchQuery] = useState(initialSearch || initialRef || "");
  const [highlightRef, setHighlightRef] = useState<string | null>(initialRef || null);
  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [counts, setCounts] = useState<BookingsCountsSummary>(initialCounts);

  // Pagination: default 10 items per page (options: 5, 10, 15, 20)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingDto | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Listen for background updates from AdminNav notification clicks
  useEffect(() => {
    function handleExternalUpdate(event: Event) {
      if (event instanceof CustomEvent && event.detail) {
        const { id, status } = event.detail;
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status } : b))
        );
        refetchBookings(activeTab, searchQuery);
      }
    }
    window.addEventListener("booking_status_updated", handleExternalUpdate);
    return () => window.removeEventListener("booking_status_updated", handleExternalUpdate);
  }, [activeTab, searchQuery]);

  // Sync when URL query parameters change (e.g. clicking from Notification Popover)
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const refParam = searchParams.get("ref");
    if (statusParam && statusParam !== activeTab) {
      setActiveTab(statusParam);
    }
    if (refParam) {
      setHighlightRef(refParam);
      setSearchQuery(refParam);
    }
  }, [searchParams]);

  function refetchBookings(
    tab: string = activeTab,
    search: string = searchQuery,
    tf: BookingTimeframe = timeframe
  ) {
    startTransition(async () => {
      const statusArg = tab === "ALL" ? "ALL" : (tab as BookingStatus);
      const res = await getAllBookings({
        status: statusArg,
        search: search.trim() || undefined,
        timeframe: tf,
        pageSize: 100,
      });

      if (res.success) {
        setBookings(res.data.bookings);
        setCounts(res.data.counts);
        setCurrentPage(1);
      }
    });
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setHighlightRef(null);
    setCurrentPage(1);
    refetchBookings(tab, searchQuery, timeframe);
    const url = new URL(window.location.href);
    if (tab === "ALL") {
      url.searchParams.delete("status");
    } else {
      url.searchParams.set("status", tab);
    }
    router.replace(url.pathname + url.search);
  }

  function handleTimeframeChange(newTf: BookingTimeframe) {
    setTimeframe(newTf);
    setCurrentPage(1);
    refetchBookings(activeTab, searchQuery, newTf);
    const url = new URL(window.location.href);
    if (newTf === "6_MONTHS") {
      url.searchParams.delete("timeframe");
    } else {
      url.searchParams.set("timeframe", newTf);
    }
    router.replace(url.pathname + url.search);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPage(1);
    // Searches full database (All-Time) on submit to ensure older records are also retrieved
    refetchBookings(activeTab, searchQuery, timeframe);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setHighlightRef(null);
    setCurrentPage(1);
    refetchBookings(activeTab, "", timeframe);
  }

  async function handleQuickConfirm(booking: BookingDto) {
    if (updatingId) return;
    setUpdatingId(booking.id);

    try {
      const res = await updateBookingStatus(booking.id, "CONFIRMED");
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? res.data : b))
        );
        setCounts((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          confirmed: prev.confirmed + 1,
        }));
        showToast(`${booking.referenceCode} confirmed!`);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusSelect(bookingId: string, newStatus: BookingStatus) {
    if (updatingId) return;
    setUpdatingId(bookingId);

    try {
      const res = await updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? res.data : b))
        );
        refetchBookings(activeTab, searchQuery);
        showToast(`Status updated to ${newStatus}`);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelModalBooking || updatingId) return;
    setUpdatingId(cancelModalBooking.id);

    try {
      const res = await cancelBooking(cancelModalBooking.id);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === cancelModalBooking.id ? res.data : b))
        );
        setCancelModalBooking(null);
        refetchBookings(activeTab, searchQuery);
        showToast(`Booking ${cancelModalBooking.referenceCode} cancelled`);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedRef(code);
    setTimeout(() => setCopiedRef(null), 2000);
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  const tabOptions = [
    {
      id: "ALL",
      labelZh: "全部",
      labelEn: "All",
      count: counts.all,
      color: "bg-muted text-foreground",
    },
    {
      id: "PENDING",
      labelZh: "待确认收据",
      labelEn: "Pending Review",
      count: counts.pending,
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
      alert: counts.pending > 0,
    },
    {
      id: "CONFIRMED",
      labelZh: "已确认锁定",
      labelEn: "Confirmed",
      count: counts.confirmed,
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },
    {
      id: "COMPLETED",
      labelZh: "已完成",
      labelEn: "Completed",
      count: counts.completed,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      id: "CANCELLED",
      labelZh: "已取消",
      labelEn: "Cancelled",
      count: counts.cancelled,
      color: "bg-red-500/10 text-red-700 dark:text-red-400",
    },
  ];

  // Instant client-side filtering on loaded bookings for 0ms typing feedback
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      return (
        b.referenceCode.toLowerCase().includes(q) ||
        b.customer.name.toLowerCase().includes(q) ||
        b.customer.phoneNumber.includes(q) ||
        b.service.name.toLowerCase().includes(q)
      );
    });
  }, [bookings, searchQuery]);

  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-card border shadow-2xl flex items-center gap-2.5 text-sm font-bold text-foreground animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-foreground">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span suppressHydrationWarning>
              {resolveLabel({ zh: "预约订单管理", en: "Bookings Management" }, langMode)}
            </span>
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1" suppressHydrationWarning>
            {resolveLabel(
              {
                zh: `共 ${counts.all} 笔历史预约记录，其中 ${counts.pending} 笔等待前台核实转账收据并确认`,
                en: `${counts.all} total bookings recorded, ${counts.pending} awaiting receipt verification & confirmation`,
              },
              langMode
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchBookings(activeTab, searchQuery)}
            disabled={isPending}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RotateCcw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
            <span suppressHydrationWarning>
              {resolveLabel({ zh: "刷新列表", en: "Refresh" }, langMode)}
            </span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabOptions.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
              )}
            >
              <span suppressHydrationWarning>
                {resolveLabel({ zh: tab.labelZh, en: tab.labelEn }, langMode)}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums transition-colors",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.color
                )}
              >
                {tab.count}
              </span>
              {tab.alert && !isActive && (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Timeframe Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              langMode === "ONLY_ZH"
                ? "即时搜索预约单号 (BK-XXXX)、顾客姓名或手机号..."
                : "Live search reference (BK-XXXX), name or phone..."
            }
            className="pl-9.5 pr-8 h-10 rounded-xl bg-card text-xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <Select
            value={timeframe}
            onValueChange={(val: BookingTimeframe) => handleTimeframeChange(val)}
          >
            <SelectTrigger className="w-[145px] sm:w-[160px] h-10 rounded-xl bg-card text-xs font-semibold shrink-0 cursor-pointer">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6_MONTHS" className="text-xs">
                {resolveLabel({ zh: "近6个月 (默认)", en: "Past 6 Months" }, langMode)}
              </SelectItem>
              <SelectItem value="30_DAYS" className="text-xs">
                {resolveLabel({ zh: "近30天", en: "Past 30 Days" }, langMode)}
              </SelectItem>
              <SelectItem value="THIS_YEAR" className="text-xs">
                {resolveLabel({ zh: "今年度", en: "This Year" }, langMode)}
              </SelectItem>
              <SelectItem value="ALL_TIME" className="text-xs">
                {resolveLabel({ zh: "全部历史 (全库)", en: "All Time (History)" }, langMode)}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Search Button */}
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="h-10 px-4 text-xs font-bold gap-1.5 rounded-xl cursor-pointer shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span suppressHydrationWarning>
              {resolveLabel({ zh: "搜索", en: "Search" }, langMode)}
            </span>
          </Button>
        </div>
      </form>

      {/* Active Search & Filter Info Pill */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {langMode === "ONLY_ZH" ? "检索：" : "Search:"}
            </span>
            <span className="font-mono text-primary font-bold">
              &quot;{searchQuery}&quot;
            </span>
            <span>
              {langMode === "ONLY_ZH"
                ? `— 匹配到 ${totalItems} 笔预约`
                : `— ${totalItems} booking(s) found`}
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              {langMode === "ONLY_ZH" ? "实时过滤" : "Live Match"}
            </Badge>
          </div>
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-primary hover:underline font-semibold cursor-pointer text-xs"
          >
            {langMode === "ONLY_ZH" ? "清除搜索" : "Clear"}
          </button>
        </div>
      )}

      {/* Bookings Table View */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "预约单号", en: "Reference" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "顾客信息", en: "Customer" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "服务项目", en: "Service" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "预约日期与时段", en: "Date & Time" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "金额与定金", en: "Pricing" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold">
                {resolveLabel({ zh: "当前状态", en: "Status" }, langMode)}
              </TableHead>
              <TableHead className="text-xs font-bold text-right pr-4">
                {resolveLabel({ zh: "快捷操作", en: "Actions" }, langMode)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
                  <p className="font-semibold text-sm text-foreground" suppressHydrationWarning>
                    {resolveLabel({ zh: "没有符合条件的预约", en: "No bookings found" }, langMode)}
                  </p>
                  <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {resolveLabel(
                      { zh: "尝试切换上方的筛选标签、时间范围或清空搜索条件", en: "Try switching filter tabs, timeframe, or clearing your search" },
                      langMode
                    )}
                  </p>
                  {searchQuery && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTimeframe("ALL_TIME");
                          refetchBookings(activeTab, searchQuery, "ALL_TIME");
                        }}
                        className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>
                          {langMode === "ONLY_ZH"
                            ? "在全库所有历史记录中深度查找"
                            : "Search All Database History"}
                        </span>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedBookings.map((b) => {
                const isHighlighted = highlightRef && b.referenceCode.toUpperCase() === highlightRef.toUpperCase();
                const isRowUpdating = updatingId === b.id;
                const isPendingBooking = b.status === "PENDING";
                const isExempt = b.depositDueCents === 0;

                const whatsappMsg =
                  langMode === "ONLY_ZH"
                    ? `您好 ${b.customer.name}！关于您在沙龙预约的 ${b.service.name} (${b.referenceCode})，预约时间为 ${format(
                        new Date(b.startDatetime),
                        "yyyy年M月d日 h:mm a"
                      )}。`
                    : `Hi ${b.customer.name}! Regarding your booking for ${b.service.name} (${b.referenceCode}) on ${format(
                        new Date(b.startDatetime),
                        "d MMM yyyy, h:mm a"
                      )}.`;

                return (
                  <TableRow
                    key={b.id}
                    className={cn(
                      "transition-colors",
                      isHighlighted && "bg-primary/10 border-l-4 border-l-primary font-medium",
                      isPendingBooking && "bg-amber-500/[0.03]"
                    )}
                  >
                    {/* Reference Code */}
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-foreground bg-muted/80 px-2 py-1 rounded-md border">
                          {b.referenceCode}
                        </span>
                        <button
                          onClick={() => copyCode(b.referenceCode)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title="Copy reference code"
                        >
                          {copiedRef === b.referenceCode ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(b.createdAt), "d MMM, h:mm a")}
                      </p>
                    </TableCell>

                    {/* Customer */}
                    <TableCell className="align-middle">
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{b.customer.name}</span>
                        </p>
                        <a
                          href={`https://wa.me/${b.customer.phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                            whatsappMsg
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{b.customer.phoneNumber}</span>
                        </a>
                      </div>
                    </TableCell>

                    {/* Service */}
                    <TableCell className="align-middle">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground">{b.service.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.service.durationMinutes} min
                        </p>
                      </div>
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell className="align-middle whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          <span>{format(new Date(b.startDatetime), "h:mm a")}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(b.startDatetime), "EEEE, d MMM yyyy")}
                        </p>
                      </div>
                    </TableCell>

                    {/* Amount & Deposit */}
                    <TableCell className="align-middle whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="font-black text-xs text-foreground tabular-nums">
                          {formatPrice(b.totalPriceCents, currencySymbol)}
                        </p>
                        {isExempt ? (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-0.5">
                            🌟 VIP免收定金
                          </span>
                        ) : b.depositDueCents != null && b.depositDueCents > 0 ? (
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              定金: {formatPrice(b.depositDueCents, currencySymbol)}
                            </span>
                            <br />
                            到店: {formatPrice(b.balanceDueCents ?? b.totalPriceCents - b.depositDueCents, currencySymbol)}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="align-middle">
                      <BookingStatusBadge
                        status={b.status}
                        receiptSubmittedAt={b.receiptSubmittedAt}
                      />
                      {b.notes && (
                        <p className="text-[10px] text-muted-foreground italic truncate max-w-[130px] mt-1" title={b.notes}>
                          “{b.notes}”
                        </p>
                      )}
                    </TableCell>

                    {/* Interactive Actions Column */}
                    <TableCell className="align-middle text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Customer Button */}
                        <a
                          href={`https://wa.me/${b.customer.phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                            whatsappMsg
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp Customer"
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </a>

                        {/* Level 2 Action: 1-Click Quick Confirm for PENDING */}
                        {isPendingBooking && (
                          <Button
                            size="sm"
                            disabled={isRowUpdating}
                            onClick={() => handleQuickConfirm(b)}
                            className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer"
                          >
                            {isRowUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span suppressHydrationWarning>
                              {resolveLabel({ zh: "确认预约", en: "Confirm" }, langMode)}
                            </span>
                          </Button>
                        )}

                        {/* Status Dropdown Selector */}
                        <Select
                          value={b.status}
                          onValueChange={(val) => handleStatusSelect(b.id, val as BookingStatus)}
                          disabled={isRowUpdating}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs font-semibold bg-card border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_SELECT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                {resolveLabel({ zh: opt.labelZh, en: opt.labelEn }, langMode)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Cancel Button */}
                        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelModalBooking(b)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Cancel booking"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls Bar */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border bg-card shadow-xs">
          {/* Left: Summary text */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span suppressHydrationWarning>
              {langMode === "ONLY_ZH" ? (
                <>
                  显示第 <strong className="text-foreground font-bold">{startIndex + 1}</strong> 至{" "}
                  <strong className="text-foreground font-bold">{endIndex}</strong> 笔，共{" "}
                  <strong className="text-foreground font-bold">{totalItems}</strong> 笔预约
                </>
              ) : (
                <>
                  Showing <strong className="text-foreground font-bold">{startIndex + 1}</strong> to{" "}
                  <strong className="text-foreground font-bold">{endIndex}</strong> of{" "}
                  <strong className="text-foreground font-bold">{totalItems}</strong> bookings
                </>
              )}
            </span>
          </div>

          {/* Right: Dropdown button for per page + Page Nav buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            {/* Dropdown selector for 5, 10, 15, 20 items per page */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold" suppressHydrationWarning>
                {langMode === "ONLY_ZH" ? "每页显示:" : "Per page:"}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-24 h-8 text-xs font-bold bg-muted/40 border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-xs font-semibold">5 / page</SelectItem>
                  <SelectItem value="10" className="text-xs font-semibold">10 / page</SelectItem>
                  <SelectItem value="15" className="text-xs font-semibold">15 / page</SelectItem>
                  <SelectItem value="20" className="text-xs font-semibold">20 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prev / Pages / Next */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="h-8 px-2.5 text-xs font-semibold gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline" suppressHydrationWarning>
                  {langMode === "ONLY_ZH" ? "上一页" : "Prev"}
                </span>
              </Button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pageNum) => {
                    return (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - validCurrentPage) <= 1
                    );
                  })
                  .map((pageNum, idx, arr) => {
                    const prevPageNum = arr[idx - 1];
                    const isGap = prevPageNum && pageNum - prevPageNum > 1;
                    return (
                      <div key={pageNum} className="flex items-center gap-1">
                        {isGap && <span className="text-xs text-muted-foreground px-0.5">…</span>}
                        <Button
                          variant={validCurrentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-8 min-w-8 px-2 text-xs font-bold",
                            validCurrentPage === pageNum
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          )}
                        >
                          {pageNum}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="h-8 px-2.5 text-xs font-semibold gap-1"
              >
                <span className="hidden sm:inline" suppressHydrationWarning>
                  {langMode === "ONLY_ZH" ? "下一页" : "Next"}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeframe Guidance Note */}
      {timeframe === "6_MONTHS" && !searchQuery.trim() && (
        <p className="text-[11px] text-muted-foreground text-center">
          {langMode === "ONLY_ZH"
            ? "当前默认展示近 6 个月活跃预约。如需查找更早的年份记录，可在上方切换为“全部历史”或直接在搜索框输入单号/电话。"
            : "Currently showing active bookings from the past 6 months. To view older records, switch the timeframe above to 'All Time' or search by reference/phone."}
        </p>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelModalBooking} onOpenChange={(open) => !open && setCancelModalBooking(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>
                {resolveLabel({ zh: "确认取消该预约？", en: "Cancel Appointment Booking?" }, langMode)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {resolveLabel(
                {
                  zh: "取消后，该时段将重新开放给其他客户预约。此操作无法撤销。",
                  en: "Cancelling will release this time slot for other customers to book. This action cannot be undone.",
                },
                langMode
              )}
            </DialogDescription>
          </DialogHeader>

          {cancelModalBooking && (
            <div className="p-3 rounded-xl bg-muted/60 border text-xs space-y-1">
              <div className="flex justify-between font-mono font-bold text-foreground">
                <span>{cancelModalBooking.referenceCode}</span>
                <span>{formatPrice(cancelModalBooking.totalPriceCents, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{cancelModalBooking.customer.name} ({cancelModalBooking.customer.phoneNumber})</span>
                <span>{cancelModalBooking.service.name}</span>
              </div>
              <div className="text-muted-foreground">
                {format(new Date(cancelModalBooking.startDatetime), "d MMM yyyy, h:mm a")}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalBooking(null)}
              className="text-xs"
            >
              {resolveLabel({ zh: "保留预约", en: "Keep Booking" }, langMode)}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!!updatingId}
              onClick={handleConfirmCancel}
              className="text-xs gap-1"
            >
              {updatingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {resolveLabel({ zh: "确认取消", en: "Confirm Cancel" }, langMode)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
