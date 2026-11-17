"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isInternalAppMode } from "@/lib/utils";
import { adminLogout } from "@/actions/auth";
import { updateDeskLanguageSetting } from "@/actions/deposit";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  Settings,
  LogOut,
  Scissors,
  FileText,
  Languages,
  Check,
  Loader2,
  Bell,
  MessageCircle,
  Users,
  Box,
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
import { FloatingBottomNav, type FloatingNavItem } from "./FloatingBottomNav";
import type { DeskLanguageMode } from "@/types";

interface NavItem {
  href: string;
  label: BilingualText;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin/desk", label: { zh: "前台收银", en: "Salon Desk" }, icon: Scissors },
  { href: "/admin", label: { zh: "总览", en: "Dashboard" }, icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: { zh: "预约记录", en: "Bookings" }, icon: CalendarDays },
  { href: "/admin/members", label: { zh: "会员配套", en: "Members" }, icon: Users },
  { href: "/admin/services", label: { zh: "服务与商品", en: "Catalog" }, icon: Package },
  { href: "/admin/reports", label: { zh: "财务对账", en: "Statements" }, icon: FileText },
  { href: "/admin/settings", label: { zh: "系统设置", en: "Settings" }, icon: Settings },
];

const mobileMoreItems: NavItem[] = navItems.slice(4);

interface AdminNavProps {
  initialLanguage?: DeskLanguageMode;
}

export function AdminNav({ initialLanguage = "ONLY_EN" }: AdminNavProps = {}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<PendingBookingItemSummary[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedToast, setConfirmedToast] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [optimisticTarget, setOptimisticTarget] = useState<{
    id: string;
    fromPath: string;
  } | null>(null);
  const { langMode, setLangMode } = useDeskLanguage(initialLanguage);
  const [, startTransition] = useTransition();

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

  useEffect(() => {
    if (isInternalAppMode()) return;
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
          if (isPageActive()) fetchPending();
          else stopPolling();
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
        fetchPending();
        startPolling();
      } else {
        stopPolling();
      }
    }

    fetchPending();
    if (isPageActive()) startPolling();

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
  const isZh = langMode === "ONLY_ZH";

  const floatingNavItems: FloatingNavItem[] = [
    {
      id: "desk",
      href: "/admin/desk",
      label: { zh: "前台收银", en: "Salon Desk" },
      onClick: () => {
        if (!pathname.startsWith("/admin/desk")) {
          setOptimisticTarget({ id: "desk", fromPath: pathname });
        }
      },
    },
    {
      id: "dashboard",
      href: "/admin",
      label: { zh: "总览", en: "Dashboard" },
      exact: true,
      onClick: () => {
        if (pathname !== "/admin") {
          setOptimisticTarget({ id: "dashboard", fromPath: pathname });
        }
      },
    },
    {
      id: "bookings",
      href: "/admin/bookings",
      label: { zh: "预约记录", en: "Bookings" },
      badgeCount: !isInternalAppMode() ? pendingCount : 0,
      onClick: () => {
        if (!pathname.startsWith("/admin/bookings")) {
          setOptimisticTarget({ id: "bookings", fromPath: pathname });
        }
      },
    },
    {
      id: "members",
      href: "/admin/members",
      label: { zh: "会员配套", en: "Members" },
      onClick: () => {
        if (!pathname.startsWith("/admin/members")) {
          setOptimisticTarget({ id: "members", fromPath: pathname });
        }
      },
    },
    {
      id: "more",
      label: { zh: "更多", en: "More" },
      onClick: () => setMoreOpen(true),
    },
  ];

  const activeFloatingId = (() => {
    if (moreOpen) return "more";
    if (optimisticTarget && optimisticTarget.fromPath === pathname) {
      return optimisticTarget.id;
    }
    if (pathname.startsWith("/admin/desk")) return "desk";
    if (pathname === "/admin") return "dashboard";
    if (pathname.startsWith("/admin/bookings")) return "bookings";
    if (pathname.startsWith("/admin/members")) return "members";
    return "more";
  })();

  return (
    <>
      {/* ================================================================= */}
      {/* DESKTOP LEFT SIDEBAR RAIL (md:flex)                               */}
      {/* ================================================================= */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:sticky md:top-0 md:h-screen border-r border-border bg-sidebar select-none">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/80">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-foreground">
            <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Box className="h-4 w-4" />
            </span>
            <span className="tracking-tight text-sm font-extrabold">SideBox</span>
          </Link>

          {!isInternalAppMode() && (
            <div className="relative" ref={notifRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                suppressHydrationWarning
                onClick={() => {
                  setNotifMenuOpen(!notifMenuOpen);
                  setLangMenuOpen(false);
                }}
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Pending bookings"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Button>

              {notifMenuOpen && (
                <div className="absolute left-0 top-10 z-50 w-80 p-2 bg-card border shadow-lg rounded-xl space-y-2">
                  <div className="px-2.5 py-1.5 border-b flex items-center justify-between text-xs font-bold">
                    <span>{resolveLabel({ zh: "待确认预约", en: "Pending" }, langMode)}</span>
                    <span className="text-muted-foreground tabular-nums">{pendingCount}</span>
                  </div>

                  {confirmedToast && (
                    <div className="mx-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>{confirmedToast}</span>
                    </div>
                  )}

                  {pendingList.length === 0 ? (
                    <div className="p-5 text-center text-xs text-muted-foreground">
                      {resolveLabel({ zh: "暂无待确认预约", en: "No pending bookings" }, langMode)}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {pendingList.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border bg-background text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="truncate">{item.customerName}</span>
                            <span className="font-mono text-[10px] text-primary">
                              {item.referenceCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="truncate">{item.serviceName}</span>
                            <span className="tabular-nums">
                              {format(new Date(item.startDatetime), "d MMM, h:mm a")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t">
                            <a
                              href={`https://wa.me/${item.phoneNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                            <Button
                              size="sm"
                              disabled={confirmingId === item.id}
                              onClick={(e) => handleQuickConfirm(e, item.id, item.referenceCode)}
                              className="h-6 px-2 text-[11px] font-semibold cursor-pointer"
                            >
                              {confirmingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                resolveLabel({ zh: "确认", en: "Confirm" }, langMode)
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span suppressHydrationWarning>
                  {isZh ? item.label.zh : item.label.en}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/80 space-y-2">
          {!isInternalAppMode() && <RushModeControl langMode={langMode} compact />}

          <div className="relative" ref={langRef}>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setLangMenuOpen(!langMenuOpen);
                setNotifMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <span suppressHydrationWarning>
                  {isZh ? "中文" : langMode === "ONLY_EN" ? "English" : currentOption.label}
                </span>
              </span>
            </button>

            {langMenuOpen && (
              <div className="absolute left-0 bottom-10 z-50 w-52 p-1 bg-card border shadow-lg rounded-xl space-y-0.5">
                {DESK_LANGUAGE_OPTIONS.map((opt) => {
                  const isSelected = opt.id === langMode;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleLanguageSwitch(opt.id)}
                      className={cn(
                        "w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-lg text-left cursor-pointer transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span suppressHydrationWarning>
              {isZh ? "退出登录" : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MOBILE TOP BAR + DETACHED FLOATING PILL NAVIGATION (< 768px)      */}
      {/* ================================================================= */}
      <header className="md:hidden sticky top-0 z-40 h-12 border-b border-border bg-background/95 backdrop-blur px-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-foreground">
          <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Box className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-extrabold tracking-tight">SideBox</span>
        </Link>

        <div className="flex items-center gap-2">
          {!isInternalAppMode() && <RushModeControl langMode={langMode} compact />}
          <Link
            href="/admin/desk"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>{isZh ? "开单" : "POS"}</span>
          </Link>
        </div>
      </header>

      <FloatingBottomNav
        items={floatingNavItems}
        activeId={activeFloatingId}
        isZh={isZh}
      />

      {/* Mobile "More" Drawer */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-5 space-y-4">
          <SheetHeader className="text-left pb-2 border-b">
            <SheetTitle className="text-base font-bold">
              {isZh ? "更多功能" : "Menu"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-1">
            {mobileMoreItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium",
                    active
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  <span>{isZh ? item.label.zh : item.label.en}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {DESK_LANGUAGE_OPTIONS.slice(0, 2).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleLanguageSwitch(opt.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer",
                    langMode === opt.id
                      ? "border-primary bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isZh ? "退出登录" : "Logout"}</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
