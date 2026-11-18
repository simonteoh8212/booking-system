"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useDeskLanguage } from "@/lib/use-desk-language";
import type { DeskLanguageMode } from "@/types";

interface DatabaseBackupCardProps {
  initialStats?: {
    servicesCount: number;
    customersCount: number;
    bookingsCount: number;
    expensesCount: number;
    totalRecords: number;
  };
  initialLanguage?: DeskLanguageMode;
}

export function DatabaseBackupCard({
  initialStats,
  initialLanguage = "ONLY_EN",
}: DatabaseBackupCardProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [isDownloadingSql, setIsDownloadingSql] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  function handleDownloadSql() {
    setIsDownloadingSql(true);
    const toastId = toast.loading(t("Generating SQL backup…", "正在生成 SQL 备份…"));

    try {
      const link = document.createElement("a");
      link.href = "/api/admin/backup-sql";
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsDownloadingSql(false);
        toast.success(t("SQL backup downloaded.", "SQL 备份已下载。"), { id: toastId });
      }, 1200);
    } catch {
      setIsDownloadingSql(false);
      toast.error(t("Download failed.", "下载失败。"), { id: toastId });
    }
  }

  function handleDownloadCsv() {
    setIsDownloadingCsv(true);
    const toastId = toast.loading(t("Exporting sales CSV…", "正在导出销售 CSV…"));

    try {
      const link = document.createElement("a");
      link.href = "/api/admin/export-sales";
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsDownloadingCsv(false);
        toast.success(t("Sales CSV exported.", "销售 CSV 已导出。"), { id: toastId });
      }, 1000);
    } catch {
      setIsDownloadingCsv(false);
      toast.error(t("Export failed.", "导出失败。"), { id: toastId });
    }
  }

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-primary shrink-0" />
          <span suppressHydrationWarning>{t("Backup & Export", "数据备份与导出")}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {initialStats && (
          <div className="rounded-xl border border-border bg-background/50 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-3.5">
              <span className="text-xs text-muted-foreground block" suppressHydrationWarning>
                {t("Total Records", "总记录")}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums mt-0.5 block">
                {initialStats.totalRecords}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-xs text-muted-foreground block" suppressHydrationWarning>
                {t("Orders", "订单")}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums mt-0.5 block">
                {initialStats.bookingsCount}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-xs text-muted-foreground block" suppressHydrationWarning>
                {t("Customers", "顾客")}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums mt-0.5 block">
                {initialStats.customersCount}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-xs text-muted-foreground block" suppressHydrationWarning>
                {t("Expenses", "开支")}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums mt-0.5 block">
                {initialStats.expensesCount}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={handleDownloadSql}
            disabled={isDownloadingSql}
            className="h-11 font-semibold gap-2 rounded-xl cursor-pointer justify-center"
          >
            {isDownloadingSql ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Download className="h-4 w-4 shrink-0" />
            )}
            <span suppressHydrationWarning>{t("Download SQL Backup", "下载 SQL 备份")}</span>
          </Button>

          <Button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isDownloadingCsv}
            variant="outline"
            className="h-11 font-semibold gap-2 rounded-xl cursor-pointer justify-center"
          >
            {isDownloadingCsv ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
            )}
            <span suppressHydrationWarning>{t("Export Sales CSV", "导出销售 CSV")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
