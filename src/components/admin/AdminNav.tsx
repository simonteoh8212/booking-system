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
} from "lucide-react";
import { useState, useTransition } from "react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel, DESK_LANGUAGE_OPTIONS, type BilingualText } from "@/lib/desk-i18n";
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

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { langMode, setLangMode } = useDeskLanguage();
  const [, startTransition] = useTransition();

  // Hide standard navigation on login and dedicated Desk POS screens
  if (pathname === "/admin/login" || pathname === "/admin/desk") {
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
                {resolveLabel(item.label, langMode)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Quick Admin Language Switcher */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="h-8 gap-1.5 px-2.5 text-xs font-medium border-border/80 hover:bg-muted cursor-pointer"
              >
                <span className="text-sm leading-none">{currentOption.flag}</span>
                <span className="hidden sm:inline font-semibold">
                  {langMode === "ONLY_ZH"
                    ? "中文"
                    : langMode === "ONLY_EN"
                    ? "EN"
                    : currentOption.label.split(" ")[0]}
                </span>
                <Languages className="h-3 w-3 text-muted-foreground opacity-70" />
              </Button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangMenuOpen(false)}
                  />
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
                </>
              )}
            </div>

            {/* Logout */}
            <form action={adminLogout}>
              <Button variant="ghost" size="sm" type="submit" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{resolveLabel({ zh: "退出", en: "Logout" }, langMode)}</span>
              </Button>
            </form>
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
                {resolveLabel(item.label, langMode)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
