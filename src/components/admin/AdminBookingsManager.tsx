"use client";

import { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
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
import { Label } from "@/components/ui/label";
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
import {
  formatPrice,
  cn,
  toBusinessDateString,
  formatSlotTimeRange,
  getPhoneSearchVariants,
} from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { createDeskAppointment } from "@/actions/desk";
import { getAvailableSlots } from "@/actions/booking";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
import type { BookingDto, BookingStatus, DeskLanguageMode, MemberDto, ServiceDto, TimeSlot } from "@/types";
import { AppointmentMemberSearch } from "@/components/admin/AppointmentMemberSearch";
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
  User,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Plus,
  CalendarCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { EmergencyClosureModal } from "./EmergencyClosureModal";

interface AdminBookingsManagerProps {
  initialBookings: BookingDto[];
  initialCounts: BookingsCountsSummary;
  services?: ServiceDto[];
  currencySymbol: string;
  initialStatus?: string;
  initialRef?: string;
  initialSearch?: string;
  initialTimeframe?: BookingTimeframe;
  initialLanguage?: DeskLanguageMode;
}

const STATUS_SELECT_OPTIONS: { id: BookingStatus; en: string; zh: string }[] = [
  { id: "PENDING", en: "Pending", zh: "待确认" },
  { id: "CONFIRMED", en: "Confirmed", zh: "已确认" },
  { id: "COMPLETED", en: "Completed", zh: "已完成" },
  { id: "NO_SHOW", en: "No-Show", zh: "未到店" },
  { id: "CANCELLED", en: "Cancelled", zh: "已取消" },
];

export function AdminBookingsManager({
  initialBookings,
  initialCounts,
  services = [],
  currencySymbol = "RM",
  initialStatus,
  initialRef,
  initialSearch,
  initialTimeframe = "6_MONTHS",
  initialLanguage = "ONLY_EN",
}: AdminBookingsManagerProps) {
  const router = useRouter();
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (
      initialStatus &&
      ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(initialStatus)
    ) {
      return initialStatus;
    }
    return "ALL";
  });

  const [timeframe, setTimeframe] = useState<BookingTimeframe>(initialTimeframe);
  const [searchQuery, setSearchQuery] = useState(initialSearch || initialRef || "");
  const [highlightRef, setHighlightRef] = useState<string | null>(initialRef || null);
  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [counts, setCounts] = useState<BookingsCountsSummary>(initialCounts);

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingDto | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const operatingHours = useMemo(() => getOperatingHoursInfo(), []);
  const todayStr = useMemo(() => toBusinessDateString(new Date()), []);
  const tomorrowStr = useMemo(() => toBusinessDateString(addDays(new Date(), 1)), []);
  const minAllowedDate = operatingHours.isPastOperatingHoursToday ? tomorrowStr : todayStr;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    serviceId: services[0]?.id || "",
    date: minAllowedDate,
    slotStartTimeIso: "",
    notes: "",
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const effectiveServiceId = createForm.serviceId || services[0]?.id || "";

  const loadSlotsFor = useCallback(
    async (dateStr: string, serviceId: string) => {
      if (dateStr === todayStr && operatingHours.isPastOperatingHoursToday) {
        setAvailableSlots([]);
        setCreateForm((prev) => ({ ...prev, slotStartTimeIso: "" }));
        return;
      }

      const selectedService = services.find((s) => s.id === serviceId) || services[0];
      const durationMinutes = selectedService?.durationMinutes || 45;

      setIsLoadingSlots(true);
      try {
        const res = await getAvailableSlots(dateStr, durationMinutes);
        if (res.success) {
          setAvailableSlots(res.data);
          setCreateForm((prev) => {
            const hasExisting = res.data.some((s) => s.startTime === prev.slotStartTimeIso);
            return {
              ...prev,
              slotStartTimeIso: hasExisting ? prev.slotStartTimeIso : res.data[0]?.startTime || "",
            };
          });
        } else {
          setAvailableSlots([]);
          setCreateForm((prev) => ({ ...prev, slotStartTimeIso: "" }));
        }
      } catch {
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [todayStr, operatingHours.isPastOperatingHoursToday, services]
  );

  const refetchBookings = useCallback(
    (
      tab: string = activeTab,
      search: string = searchQuery,
      tf: BookingTimeframe = timeframe
    ) => {
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
    },
    [activeTab, searchQuery, timeframe]
  );

  useEffect(() => {
    function handleExternalUpdate(event: Event) {
      if (event instanceof CustomEvent && event.detail) {
        const { id, status } = event.detail;
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        refetchBookings(activeTab, searchQuery);
      }
    }
    window.addEventListener("booking_status_updated", handleExternalUpdate);
    return () => window.removeEventListener("booking_status_updated", handleExternalUpdate);
  }, [activeTab, searchQuery, refetchBookings]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleOpenCreate() {
    const initialServiceId = services[0]?.id || "";
    setCreateError(null);
    setCreateForm({
      name: "",
      phone: "",
      serviceId: initialServiceId,
      date: minAllowedDate,
      slotStartTimeIso: "",
      notes: "",
    });
    setIsCreateOpen(true);
    void loadSlotsFor(minAllowedDate, initialServiceId);
  }

  function handleManualCreate() {
    setCreateError(null);
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setCreateError(t("Name and phone number are required.", "请输入顾客姓名和手机号。"));
      return;
    }
    if (!effectiveServiceId) {
      setCreateError(t("Please select a service.", "请选择服务项目。"));
      return;
    }
    if (createForm.date === todayStr && operatingHours.isPastOperatingHoursToday) {
      setCreateError(t("Operating hours have ended for today.", "今日营业时间已结束。"));
      return;
    }
    if (!createForm.slotStartTimeIso) {
      setCreateError(t("Please select a time slot.", "请选择预约时段。"));
      return;
    }

    startTransition(async () => {
      const res = await createDeskAppointment({
        customerName: createForm.name.trim(),
        phoneNumber: createForm.phone.trim(),
        serviceId: effectiveServiceId,
        startDatetimeIso: createForm.slotStartTimeIso,
        notes: createForm.notes.trim() || undefined,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setSelectedMember(null);
        refetchBookings(activeTab, searchQuery);
        showToast(
          isZh
            ? `已创建预约：${res.data.referenceCode}`
            : `Appointment created: ${res.data.referenceCode}`
        );
      } else {
        setCreateError(res.error);
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
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setCurrentPage(1);
    refetchBookings(activeTab, searchQuery, timeframe);
  }

  function handleClearSearch() {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
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
        setBookings((prev) => prev.map((b) => (b.id === booking.id ? res.data : b)));
        setCounts((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          confirmed: prev.confirmed + 1,
        }));
        showToast(t(`${booking.referenceCode} confirmed`, `${booking.referenceCode} 已确认`));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusSelect(bookingId: string, newStatus: BookingStatus) {
    if (updatingId) return;
    if (newStatus === "CANCELLED") {
      const target = bookings.find((b) => b.id === bookingId);
      if (target) setCancelModalBooking(target);
      return;
    }
    setUpdatingId(bookingId);

    try {
      const res = await updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.data : b)));
        refetchBookings(activeTab, searchQuery);
        showToast(t(`Status updated to ${newStatus}`, "状态已更新"));
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
        showToast(t("Booking cancelled", "预约已取消"));
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

  const tabOptions = [
    { id: "ALL", label: t("All", "全部"), count: counts.all },
    { id: "PENDING", label: t("Pending", "待确认"), count: counts.pending },
    { id: "CONFIRMED", label: t("Confirmed", "已确认"), count: counts.confirmed },
    { id: "COMPLETED", label: t("Completed", "已完成"), count: counts.completed },
    { id: "CANCELLED", label: t("Cancelled", "已取消"), count: counts.cancelled },
  ];

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    const phoneVariants = getPhoneSearchVariants(searchQuery);
    return bookings.filter(
      (b) =>
        b.referenceCode.toLowerCase().includes(q) ||
        b.customer.name.toLowerCase().includes(q) ||
        phoneVariants.some((variant) => b.customer.phoneNumber.includes(variant)) ||
        b.service.name.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  function buildWhatsappUrl(b: BookingDto) {
    const msg = isZh
      ? `您好 ${b.customer.name}，关于您的预约 ${b.service.name} (${b.referenceCode})，时间为 ${format(
          new Date(b.startDatetime),
          "yyyy年M月d日 h:mm a"
        )}。`
      : `Hi ${b.customer.name}, regarding your ${b.service.name} booking (${b.referenceCode}) on ${format(
          new Date(b.startDatetime),
          "d MMM yyyy, h:mm a"
        )}.`;
    let digits = b.customer.phoneNumber.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "60" + digits.slice(1);
    } else if (digits.startsWith("1") && digits.length >= 9 && digits.length <= 10) {
      digits = "60" + digits;
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-card border border-border shadow-lg flex items-center gap-2 text-sm font-semibold text-foreground animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" suppressHydrationWarning>
          {t("Bookings", "预约记录")}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{t("New Booking", "新建预约")}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEmergencyModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold rounded-lg cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
            <span suppressHydrationWarning>{t("Emergency Closure", "突发闭店")}</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchBookings(activeTab, searchQuery)}
            disabled={isPending}
            className="h-9 w-9 rounded-lg cursor-pointer"
            title={t("Refresh", "刷新")}
            aria-label={t("Refresh", "刷新")}
          >
            <RotateCcw className={cn("h-4 w-4", isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tabOptions.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 h-10 sm:h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border"
              )}
            >
              <span suppressHydrationWarning>{tab.label}</span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  isActive ? "text-primary-foreground/85" : "text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
              {tab.id === "PENDING" && tab.count > 0 && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Timeframe (250ms live debounced server search) */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              setCurrentPage(1);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => {
                refetchBookings(activeTab, val, timeframe);
              }, 250);
            }}
            placeholder={t("Search reference, name, or phone…", "搜索单号、姓名或手机号…")}
            className="pl-9 pr-9 h-10 sm:h-9 rounded-lg bg-card text-base sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              aria-label={t("Clear search", "清除搜索")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={timeframe}
          onValueChange={(val) => {
            if (val) handleTimeframeChange(val as BookingTimeframe);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9 rounded-lg bg-card text-xs font-semibold shrink-0 cursor-pointer">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6_MONTHS" className="text-xs">
              {t("Past 6 Months", "近 6 个月")}
            </SelectItem>
            <SelectItem value="30_DAYS" className="text-xs">
              {t("Past 30 Days", "近 30 天")}
            </SelectItem>
            <SelectItem value="THIS_YEAR" className="text-xs">
              {t("This Year", "今年")}
            </SelectItem>
            <SelectItem value="ALL_TIME" className="text-xs">
              {t("All Time", "全部记录")}
            </SelectItem>
          </SelectContent>
        </Select>
      </form>

      {/* Mobile List (< md) */}
      <div className="md:hidden rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {paginatedBookings.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2 text-muted-foreground">
            <p className="font-semibold text-sm text-foreground" suppressHydrationWarning>
              {t("No bookings found", "暂无符合条件的预约")}
            </p>
            {searchQuery && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setTimeframe("ALL_TIME");
                  refetchBookings(activeTab, searchQuery, "ALL_TIME");
                }}
                className="text-xs rounded-lg cursor-pointer"
              >
                {t("Search All History", "搜索全部历史")}
              </Button>
            )}
          </div>
        ) : (
          paginatedBookings.map((b) => {
            const isRowUpdating = updatingId === b.id;
            const isPendingBooking = b.status === "PENDING";
            const isHighlighted =
              highlightRef && b.referenceCode.toUpperCase() === highlightRef.toUpperCase();

            return (
              <div
                key={b.id}
                className={cn(
                  "p-3.5 space-y-2.5",
                  isHighlighted && "bg-primary/5",
                  isPendingBooking && !isHighlighted && "bg-amber-500/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {b.customer.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {b.referenceCode}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {b.service.name} · {format(new Date(b.startDatetime), "d MMM, h:mm a")}
                    </div>
                    {b.notes && (
                      <div className="text-[11px] text-muted-foreground/85 mt-0.5 truncate">
                        {b.notes}
                      </div>
                    )}
                  </div>
                  <BookingStatusBadge
                    status={b.status}
                    receiptSubmittedAt={b.receiptSubmittedAt}
                    isZh={isZh}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-3 text-xs min-w-0">
                    <span className="font-semibold text-foreground tabular-nums shrink-0">
                      {formatPrice(b.totalPriceCents, currencySymbol)}
                    </span>
                    {b.customer.phoneNumber.startsWith("WALKIN-") ? (
                      <span className="text-muted-foreground text-[11px]">
                        {t("Walk-in", "散客")}
                      </span>
                    ) : (
                      <a
                        href={buildWhatsappUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium truncate"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono truncate">{b.customer.phoneNumber}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPendingBooking && (
                      <Button
                        size="sm"
                        disabled={isRowUpdating}
                        onClick={() => handleQuickConfirm(b)}
                        className="h-10 px-3 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {isRowUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t("Confirm", "确认")
                        )}
                      </Button>
                    )}

                    <Select
                      value={b.status}
                      onValueChange={(val) => handleStatusSelect(b.id, val as BookingStatus)}
                      disabled={isRowUpdating}
                    >
                      <SelectTrigger className="w-28 h-10 text-xs bg-background rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_SELECT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id} className="text-xs">
                            {t(opt.en, opt.zh)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCancelModalBooking(b)}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                        title={t("Cancel booking", "取消预约")}
                        aria-label={t("Cancel booking", "取消预约")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Reference", "单号")}
              </TableHead>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Customer", "顾客")}
              </TableHead>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Service", "服务项目")}
              </TableHead>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Date & Time", "预约时间")}
              </TableHead>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Amount", "金额")}
              </TableHead>
              <TableHead className="text-xs font-semibold" suppressHydrationWarning>
                {t("Status", "状态")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-right pr-4" suppressHydrationWarning>
                {t("Actions", "操作")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-14 text-muted-foreground space-y-2">
                  <p className="font-semibold text-sm text-foreground" suppressHydrationWarning>
                    {t("No bookings found", "暂无符合条件的预约")}
                  </p>
                  {searchQuery && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTimeframe("ALL_TIME");
                        refetchBookings(activeTab, searchQuery, "ALL_TIME");
                      }}
                      className="text-xs font-semibold gap-1.5 rounded-lg cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>{t("Search All History", "搜索全部历史")}</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedBookings.map((b) => {
                const isHighlighted =
                  highlightRef && b.referenceCode.toUpperCase() === highlightRef.toUpperCase();
                const isRowUpdating = updatingId === b.id;
                const isPendingBooking = b.status === "PENDING";
                const isExempt = b.depositDueCents === 0;

                return (
                  <TableRow
                    key={b.id}
                    className={cn(
                      "transition-colors",
                      isHighlighted && "bg-primary/5",
                      isPendingBooking && !isHighlighted && "bg-amber-500/[0.03]"
                    )}
                  >
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                          {b.referenceCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(b.referenceCode)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title={t("Copy reference", "复制单号")}
                        >
                          {copiedRef === b.referenceCode ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {format(new Date(b.createdAt), "d MMM, h:mm a")}
                      </p>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{b.customer.name}</span>
                        </p>
                        {b.customer.phoneNumber.startsWith("WALKIN-") ? (
                          <span className="text-[11px] text-muted-foreground">
                            {t("Walk-in", "散客")}
                          </span>
                        ) : (
                          <a
                            href={buildWhatsappUrl(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary font-medium inline-flex items-center gap-1 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{b.customer.phoneNumber}</span>
                          </a>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="space-y-0.5">
                        <p className="font-medium text-xs text-foreground">{b.service.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {b.service.durationMinutes} min
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground flex items-center gap-1.5 tabular-nums">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          <span>{format(new Date(b.startDatetime), "h:mm a")}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {format(new Date(b.startDatetime), "EEE, d MMM yyyy")}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle whitespace-nowrap">
                      <div className="space-y-0.5 tabular-nums">
                        <p className="font-semibold text-xs text-foreground">
                          {formatPrice(b.totalPriceCents, currencySymbol)}
                        </p>
                        {isExempt ? (
                          <span className="text-[11px] text-muted-foreground">
                            {t("VIP Exempt", "VIP 免定金")}
                          </span>
                        ) : b.depositDueCents != null && b.depositDueCents > 0 ? (
                          <div className="text-[11px] text-muted-foreground">
                            <span>
                              {t("Dep", "定金")}: {formatPrice(b.depositDueCents, currencySymbol)}
                            </span>
                            {" · "}
                            <span>
                              {t("Bal", "到店")}:{" "}
                              {formatPrice(
                                b.balanceDueCents ?? b.totalPriceCents - b.depositDueCents,
                                currencySymbol
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <BookingStatusBadge
                        status={b.status}
                        receiptSubmittedAt={b.receiptSubmittedAt}
                        isZh={isZh}
                      />
                      {b.notes && (
                        <p
                          className="text-[11px] text-muted-foreground truncate max-w-[140px] mt-1"
                          title={b.notes}
                        >
                          {b.notes}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="align-middle text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {!b.customer.phoneNumber.startsWith("WALKIN-") && (
                          <a
                            href={buildWhatsappUrl(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-border text-primary hover:bg-muted transition-colors"
                            title="WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {isPendingBooking && (
                          <Button
                            size="sm"
                            disabled={isRowUpdating}
                            onClick={() => handleQuickConfirm(b)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                          >
                            {isRowUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span suppressHydrationWarning>{t("Confirm", "确认")}</span>
                          </Button>
                        )}

                        <Select
                          value={b.status}
                          onValueChange={(val) => handleStatusSelect(b.id, val as BookingStatus)}
                          disabled={isRowUpdating}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs font-medium bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_SELECT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                {t(opt.en, opt.zh)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelModalBooking(b)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={t("Cancel booking", "取消预约")}
                            aria-label={t("Cancel booking", "取消预约")}
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

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
            {startIndex + 1}–{endIndex} / {totalItems}
          </span>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-24 h-8 text-xs font-medium bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5" className="text-xs">5 / page</SelectItem>
                <SelectItem value="10" className="text-xs">10 / page</SelectItem>
                <SelectItem value="15" className="text-xs">15 / page</SelectItem>
                <SelectItem value="20" className="text-xs">20 / page</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("Prev", "上一页")}</span>
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (pageNum) =>
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - validCurrentPage) <= 1
                )
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
                        className="h-8 min-w-8 px-2 text-xs font-semibold tabular-nums"
                      >
                        {pageNum}
                      </Button>
                    </div>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <span className="hidden sm:inline">{t("Next", "下一页")}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelModalBooking} onOpenChange={(open) => !open && setCancelModalBooking(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>{t("Cancel Booking?", "确认取消预约？")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "This releases the time slot and cannot be undone.",
                "取消后将释放该预约时段，此操作无法撤销。"
              )}
            </DialogDescription>
          </DialogHeader>

          {cancelModalBooking && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-1">
              <div className="flex justify-between font-mono font-semibold text-foreground">
                <span>{cancelModalBooking.referenceCode}</span>
                <span>{formatPrice(cancelModalBooking.totalPriceCents, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {cancelModalBooking.customer.name} ({cancelModalBooking.customer.phoneNumber})
                </span>
                <span>{cancelModalBooking.service.name}</span>
              </div>
              <div className="text-muted-foreground tabular-nums">
                {format(new Date(cancelModalBooking.startDatetime), "d MMM yyyy, h:mm a")}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalBooking(null)}
              className="h-10 sm:h-9 w-full sm:w-auto text-xs font-semibold cursor-pointer"
            >
              {t("Keep", "保留")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!!updatingId}
              onClick={handleConfirmCancel}
              className="h-10 sm:h-9 w-full sm:w-auto text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {updatingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("Cancel Booking", "确认取消")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Closure Modal */}
      <EmergencyClosureModal
        isOpen={isEmergencyModalOpen}
        onClose={() => {
          setIsEmergencyModalOpen(false);
          refetchBookings(activeTab, searchQuery);
        }}
        langMode={langMode}
        currencySymbol={currencySymbol}
      />

      {/* Manual Appointment Creation Modal */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span suppressHydrationWarning>{t("New Appointment", "新建预约")}</span>
            </DialogTitle>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="space-y-3.5 py-1">
            <AppointmentMemberSearch
              selectedMember={selectedMember}
              services={services}
              currencySymbol={currencySymbol}
              isZh={isZh}
              onSelectMember={(member) => {
                setSelectedMember(member);
                const promoSvcId = member.activePackages
                  .flatMap((p) => p.serviceIds)
                  .find((sid) => services.some((s) => s.id === sid));
                setCreateForm((prev) => ({
                  ...prev,
                  name: member.name,
                  phone: member.phoneNumber,
                  ...(promoSvcId ? { serviceId: promoSvcId } : {}),
                }));
                if (promoSvcId) {
                  void loadSlotsFor(createForm.date, promoSvcId);
                }
              }}
              onClearMember={() => {
                setSelectedMember(null);
                setCreateForm((prev) => ({ ...prev, name: "", phone: "" }));
              }}
              onQuickSelectService={(serviceId) => {
                setCreateForm((prev) => ({ ...prev, serviceId }));
                void loadSlotsFor(createForm.date, serviceId);
              }}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("Customer Name", "顾客姓名")} *</Label>
              <Input
                placeholder={t("e.g. Alex Tan", "例如：陈先生")}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="h-10 text-base sm:text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("Phone", "手机号码")} *</Label>
              <Input
                placeholder="0123456789"
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="h-10 text-base sm:text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("Service", "服务项目")} *</Label>
              <select
                value={effectiveServiceId}
                onChange={(e) => {
                  const nextServiceId = e.target.value;
                  setCreateForm({ ...createForm, serviceId: nextServiceId });
                  void loadSlotsFor(createForm.date, nextServiceId);
                }}
                className="w-full h-10 rounded-lg border px-3 text-sm bg-background border-input"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatPrice(s.priceCents, currencySymbol)} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">{t("Date", "日期")} *</Label>
                <Input
                  type="date"
                  min={minAllowedDate}
                  value={createForm.date}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setCreateForm({ ...createForm, date: nextDate });
                    void loadSlotsFor(nextDate, effectiveServiceId);
                  }}
                  className="h-10 text-base sm:text-sm rounded-lg w-full"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Label className="text-xs font-semibold whitespace-nowrap">
                    {t("Time Slot", "时段")} *
                  </Label>
                  {!isLoadingSlots && availableSlots.length > 0 && (
                    <span className="inline-flex items-center px-2 h-5 rounded-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 tabular-nums shrink-0">
                      {availableSlots.length} {t("available", "个可选")}
                    </span>
                  )}
                </div>

                {isLoadingSlots ? (
                  <div className="h-10 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-primary" />
                    <span>{t("Loading…", "加载中…")}</span>
                  </div>
                ) : createForm.date === todayStr && operatingHours.isPastOperatingHoursToday ? (
                  <div className="h-10 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center px-3 text-xs text-destructive font-medium">
                    {t("Closed for today", "今日已结束营业")}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="h-10 rounded-lg border border-border bg-muted/40 flex items-center px-3 text-xs text-muted-foreground">
                    {t("No slots available", "暂无可用时段")}
                  </div>
                ) : (
                  <select
                    value={createForm.slotStartTimeIso}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, slotStartTimeIso: e.target.value })
                    }
                    className="w-full h-10 rounded-lg border px-3 text-sm bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot.startTime} value={slot.startTime}>
                        {formatSlotTimeRange(slot.startTime, slot.endTime)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("Notes", "备注")}</Label>
              <Input
                placeholder={t("Optional", "选填")}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                className="h-10 text-base sm:text-sm rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 gap-2.5 px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isPending}
              className="h-10 sm:h-9 w-full sm:w-auto text-xs"
            >
              {t("Cancel", "取消")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleManualCreate}
              disabled={
                isPending ||
                isLoadingSlots ||
                availableSlots.length === 0 ||
                !createForm.slotStartTimeIso ||
                (createForm.date === todayStr && operatingHours.isPastOperatingHoursToday)
              }
              className="h-10 sm:h-9 w-full sm:w-auto text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("Create Appointment", "确认创建")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
