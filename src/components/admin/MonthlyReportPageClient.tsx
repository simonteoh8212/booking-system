"use client";

import { useState, useEffect } from "react";
import { DeskFinancialReportView } from "@/components/desk/DeskFinancialReportView";
import { DeskPinUnlockDialog } from "@/components/desk/DeskPinUnlockDialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import type { DeskLanguageMode } from "@/types";
import { useDeskLanguage } from "@/lib/use-desk-language";

interface MonthlyReportPageClientProps {
  currencySymbol?: string;
  initialLanguage?: DeskLanguageMode;
  requireReportPin?: boolean;
}

/**
 * Standalone wrapper for the Monthly Financial Report page in the Admin sidebar.
 * Respects the "Require PIN for Monthly Financial Report" setting.
 */
export function MonthlyReportPageClient({
  currencySymbol = "RM",
  initialLanguage = "ONLY_EN",
  requireReportPin = true,
}: MonthlyReportPageClientProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !requireReportPin);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!requireReportPin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsUnlocked(true);
      return;
    }

    try {
      if (sessionStorage.getItem("desk_finance_unlocked") === "true") {
        setIsUnlocked(true);
        return;
      }
    } catch {}

    setIsUnlocked(false);
    setIsPinDialogOpen(true);
  }, [requireReportPin]);

  if (!isUnlocked) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 text-center max-w-md mx-auto my-10 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold tracking-tight" suppressHydrationWarning>
              {t("Monthly Financial Report Locked", "月度财务报表已锁定")}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed" suppressHydrationWarning>
              {t(
                "Enter your 4-digit owner PIN to view monthly sales, expenses, and net profit.",
                "请输入 4 位管理员密码以查看月度营收、开支与净利润。"
              )}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsPinDialogOpen(true)}
            className="h-10 px-5 rounded-xl font-semibold gap-2 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>{t("Unlock with 4-Digit PIN", "输入 4 位密码解锁")}</span>
          </Button>
        </div>

        <DeskPinUnlockDialog
          open={isPinDialogOpen}
          onOpenChange={setIsPinDialogOpen}
          languageMode={langMode}
          onSuccess={() => {
            setIsUnlocked(true);
            setIsPinDialogOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <DeskFinancialReportView
      currencySymbol={currencySymbol}
      languageMode={langMode}
    />
  );
}
