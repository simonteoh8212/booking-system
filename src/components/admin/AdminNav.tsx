"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/actions/auth";
import { updateDeskLanguageSetting } from "@/actions/deposit";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  Settings,
  LogOut,
  Menu,
  X,
  Scissors,
  FileText,
  Languages,
  Check,
  Loader2,
  Bell,
  Clock,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useTransition, useRef } from "react";
import { format } from "date-fns";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel, DESK_LANGUAGE_OPTIONS, type BilingualText } from "@/lib/desk-i18n";
import {
  getPendingBookingsSummary,
  updateBookingStatus,
  type PendingBookingItemSummary,
} from "@/actions/admin-bookings";
import { RushModeControl } from "./RushModeControl";
import type { DeskLanguageMode } from "@/types";

interface NavItem {
  href: string;
  label: BilingualText;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin/desk", label: { zh: "前台开单 (POS)", en: "Salon Desk (POS)" }, icon: Scissors },
  { href: "/admin", label: { zh: "仪表盘", en: "Dashboard" }, icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: { zh: "预约管理", en: "Bookings" }, icon: CalendarDays },
  { href: "/admin/services", label: { zh: "服务项目", en: "Services" }, icon: Wrench },
  { href: "/admin/reports", label: { zh: "财务对账单", en: "Statements" }, icon: FileText },
  { href: "/admin/settings", label: { zh: "系统设置", en: "Settings" }, icon: Settings },
];

interface AdminNavProps {
  initialLanguage?: DeskLanguageMode;
}

export function AdminNav({ initialLanguage = "ONLY_EN" }: AdminNavProps = {}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<PendingBookingItemSummary[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedToast, setConfirmedToast] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { langMode, setLangMode, mounted } = useDeskLanguage(initialLanguage);
  const [, startTransition] = useTransition();

  // Close notification pop up and language menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;

      if (notifMenuOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifMenuOpen(false);
      }

      if (langMenuOpen && langRef.current && !langRef.current.contains(target)) {
        setLangMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotifMenuOpen(false);
        setLangMenuOpen(false);
      }
    }

    if (notifMenuOpen || langMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifMenuOpen, langMenuOpen]);

  async function handleQuickConfirm(e: React.MouseEvent, id: string, refCode: string) {
    e.stopPropagation();
    e.preventDefault();
    if (confirmingId) return;
    setConfirmingId(id);

    try {
      const res = await updateBookingStatus(id, "CONFIRMED");
      if (res.success) {
        setPendingCount((prev) => Math.max(0, prev - 1));
        setPendingList((prev) => prev.filter((item) => item.id !== id));
        setConfirmedToast(refCode);
        setTimeout(() => setConfirmedToast(null), 3000);
        window.dispatchEvent(
          new CustomEvent("booking_status_updated", {
            detail: { id, status: "CONFIRMED" },
          })
        );
      }
    } catch (err) {
      console.error("[handleQuickConfirm]", err);
    } finally {
      setConfirmingId(null);
    }
  }

  // Load and periodically refresh pending booking count for notification badge
  // Pauses automatically when tab is hidden, minimized, or when user switches to another desktop app
  useEffect(() => {
    let ignore = false;
    let intervalId: NodeJS.Timeout | null = null;

    function isPageActive(): boolean {
      if (typeof document === "undefined") return false;
      return !document.hidden && document.hasFocus();
    }

    async function fetchPending() {
      const res = await getPendingBookingsSummary();
      if (!ignore && res.success) {
        setPendingCount(res.data.count);
        setPendingList(res.data.bookings);
      }
    }

    function startPolling() {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (isPageActive()) {
            fetchPending();
          } else {
            stopPolling();
          }
        }, 15000);
      }
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleActiveStateChange() {
      if (isPageActive()) {
        // Regained focus or became visible: fetch fresh data immediately and resume timer
        fetchPending();
        startPolling();
      } else {
        // Tab hidden or user switched to another desktop application: pause polling completely (0 API calls)
        stopPolling();
      }
    }

    // Always fetch once on initial load
    fetchPending();

    if (isPageActive()) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleActiveStateChange);
    window.addEventListener("focus", handleActiveStateChange);
    window.addEventListener("blur", handleActiveStateChange);

    return () => {
      ignore = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleActiveStateChange);
      window.removeEventListener("focus", handleActiveStateChange);
      window.removeEventListener("blur", handleActiveStateChange);
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await adminLogout();
    } catch (e) {
      console.error("[logout]", e);
    } finally {
      window.location.href = "/admin/login";
    }
  }

  // Hide standard navigation on login screen
  if (pathname === "/admin/login") {
    return null;
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function handleLanguageSwitch(newMode: DeskLanguageMode) {
    setLangMode(newMode);
    setLangMenuOpen(false);
    startTransition(async () => {
      await updateDeskLanguageSetting(newMode);
    });
  }

  const currentOption =
    DESK_LANGUAGE_OPTIONS.find((o) => o.id === langMode) || DESK_LANGUAGE_OPTIONS[0];

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4 gap-4">
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2 font-bold text-primary">
            <CalendarDays className="h-5 w-5" />
            <span>BookEase</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span suppressHydrationWarning>
                  {langMode === "ONLY_ZH" ? item.label.zh : item.label.en}
                </span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Rush Mode (Pause online booking for walk-in rush) */}
            <RushModeControl langMode={langMode} compact />

            {/* Notification with Counter Badge (Pending customer bookings) */}
            <div className="relative" ref={notifRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                suppressHydrationWarning
                onClick={() => {
                  setNotifMenuOpen(!notifMenuOpen);
                  setLangMenuOpen(false);
                }}
                className={cn(
                  "relative h-8 px-2.5 text-xs font-medium border-border/80 hover:bg-muted cursor-pointer transition-colors",
                  pendingCount > 0 ? "text-foreground border-amber-500/40" : "text-muted-foreground"
                )}
                title={
                  langMode === "ONLY_ZH"
                    ? `${pendingCount} 笔待确认客户预约`
                    : `${pendingCount} pending customer booking confirmation${pendingCount === 1 ? "" : "s"}`
                }
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm animate-pulse">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Button>

              {notifMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-92 sm:w-96 p-2 bg-card border shadow-2xl rounded-2xl space-y-2 animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1.5 border-b flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <Bell className="h-3.5 w-3.5 text-primary" />
                        <span suppressHydrationWarning>
                          {resolveLabel(
                            { zh: "待确认客户预约", en: "Pending Confirmations" },
                            langMode
                          )}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-[10px]">
                        {pendingCount} {resolveLabel({ zh: "待处理", en: "Pending" }, langMode)}
                      </span>
                    </div>

                    {confirmedToast && (
                      <div className="mx-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{confirmedToast} {resolveLabel({ zh: "已成功确认！", en: "confirmed successfully!" }, langMode)}</span>
                      </div>
                    )}

                    {pendingList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                        <Check className="h-6 w-6 text-emerald-500 mx-auto opacity-70 mb-1" />
                        <p className="font-semibold text-foreground" suppressHydrationWarning>
                          {resolveLabel({ zh: "暂无待确认预约", en: "No pending bookings" }, langMode)}
                        </p>
                        <p className="text-[10px]" suppressHydrationWarning>
                          {resolveLabel(
                            { zh: "顾客提交预约将实时在此提醒", en: "New customer bookings will appear here" },
                            langMode
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                        {pendingList.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-bold text-foreground">
                              <span className="truncate max-w-[170px]">{item.customerName}</span>
                              <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                {item.referenceCode}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="truncate max-w-[170px]">{item.serviceName}</span>
                              <span className="text-[10px] font-semibold text-foreground">
                                {format(new Date(item.startDatetime), "d MMM, h:mm a")}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                              {item.receiptSubmittedAt ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  ✓ {resolveLabel({ zh: "已递交收据", en: "Receipt Submitted" }, langMode)}
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                  <Clock className="h-3 w-3 inline" />
                                  {resolveLabel({ zh: "7分钟临时保留中", en: "7-min Hold" }, langMode)}
                                </span>
                              )}
                              <span className="text-muted-foreground/70 font-mono text-[9px]">
                                {format(new Date(item.createdAt), "h:mm a")}
                              </span>
                            </div>

                            {/* Level 1 Quick Actions */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
                              <a
                                href={`https://wa.me/${item.phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  langMode === "ONLY_ZH"
                                    ? `您好 ${item.customerName}！关于您预约的 ${item.serviceName} (${item.referenceCode})，我们已收到您的预约。`
                                    : `Hi ${item.customerName}! Regarding your appointment for ${item.serviceName} (${item.referenceCode}), we have received your booking.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                                title="WhatsApp Customer"
                              >
                                <MessageCircle className="h-3 w-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </a>

                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/admin/bookings?status=PENDING&ref=${item.referenceCode}`}
                                  onClick={() => setNotifMenuOpen(false)}
                                  className="px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                  {resolveLabel({ zh: "查看", en: "View" }, langMode)}
                                </Link>

                                <Button
                                  size="sm"
                                  disabled={confirmingId === item.id}
                                  onClick={(e) => handleQuickConfirm(e, item.id, item.referenceCode)}
                                  className="h-6.5 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs cursor-pointer"
                                >
                                  {confirmingId === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  <span>{resolveLabel({ zh: "一键确认", en: "Confirm" }, langMode)}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1.5 border-t">
                      <Link
                        href="/admin/bookings?status=PENDING"
                        onClick={() => setNotifMenuOpen(false)}
                        className="block w-full py-1.5 text-center text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        {resolveLabel({ zh: "前往预约管理处理待确认 →", en: "Manage all pending bookings →" }, langMode)}
                      </Link>
                    </div>
                  </div>
              )}
            </div>

            {/* Quick Admin Language Switcher */}
            <div className="relative" ref={langRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                suppressHydrationWarning
                onClick={() => {
                  setLangMenuOpen(!langMenuOpen);
                  setNotifMenuOpen(false);
                }}
                className="h-8 gap-1.5 px-2.5 text-xs font-medium border-border/80 hover:bg-muted cursor-pointer"
              >
                <span className="text-sm leading-none" suppressHydrationWarning>{currentOption.flag}</span>
                <span className="hidden sm:inline font-semibold" suppressHydrationWarning>
                  {langMode === "ONLY_ZH"
                    ? "中文"
                    : langMode === "ONLY_EN"
                    ? "EN"
                    : currentOption.label.split(" ")[0]}
                </span>
                <Languages className="h-3 w-3 text-muted-foreground opacity-70" />
              </Button>

              {langMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 p-1.5 bg-card border shadow-xl rounded-xl space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 border-b mb-1">
                    <p className="text-xs font-bold text-foreground">
                      {resolveLabel({ zh: "选择系统语言", en: "Select Language" }, langMode)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {resolveLabel(
                        { zh: "即时更新前台与管理后台语言", en: "Updates POS and admin pages instantly" },
                        langMode
                      )}
                    </p>
                  </div>
                  {DESK_LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = opt.id === langMode;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleLanguageSwitch(opt.id)}
                        className={cn(
                          "w-full flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer rounded-lg text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{opt.flag}</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.subLabel}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-2 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              type="button"
              suppressHydrationWarning
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
              title={langMode === "ONLY_ZH" ? "退出登录" : "Logout"}
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline" suppressHydrationWarning>
                {isLoggingOut
                  ? (langMode === "ONLY_ZH" ? "退出中..." : "Exiting...")
                  : (langMode === "ONLY_ZH" ? "退出登录" : "Logout")}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-30 bg-background/95 backdrop-blur md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span suppressHydrationWarning>
                  {langMode === "ONLY_ZH" ? item.label.zh : item.label.en}
                </span>
              </Link>
            ))}

            <div className="pt-3 mt-2 border-t">
              <Button
                variant="destructive"
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span suppressHydrationWarning>
                  {isLoggingOut
                    ? (langMode === "ONLY_ZH" ? "正在退出..." : "Signing out...")
                    : (langMode === "ONLY_ZH" ? "退出登录" : "Logout")}
                </span>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
