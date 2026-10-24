"use client";

import Link from "next/link";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import { CalendarDays, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerHeaderProps {
  businessName?: string;
}

export function CustomerHeader({ businessName = "Our Salon" }: CustomerHeaderProps) {
  const { language, toggleLanguage, t } = useCustomerLanguage();

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30 select-none">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Salon Brand */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-xs">
            <CalendarDays className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-sm leading-tight text-foreground truncate">
              {businessName}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium" suppressHydrationWarning>
              {t.header.onlineBooking[language]}
            </p>
          </div>
        </Link>

        {/* Right Actions: Language Switcher + Check Booking */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Top Bar Language Switcher Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 px-2.5 rounded-xl text-xs font-bold border border-border/80 bg-card hover:bg-muted text-foreground flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Switch Language (English / 中文)"
            aria-label="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex items-center gap-1 text-[11px]">
              <span className={language === "zh" ? "font-black text-primary" : "text-muted-foreground"}>
                中
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className={language === "en" ? "font-black text-primary" : "text-muted-foreground"}>
                EN
              </span>
            </div>
          </Button>

          {/* Check Booking Button */}
          <Link
            href="/check-booking"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors border shadow-2xs h-9"
          >
            <Search className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline">{t.header.checkBooking[language]}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
