"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, FileSpreadsheet, ShieldCheck, Info, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";

interface DatabaseBackupCardProps {
  initialStats?: {
    servicesCount: number;
    customersCount: number;
    bookingsCount: number;
    expensesCount: number;
    totalRecords: number;
  };
}

export function DatabaseBackupCard({ initialStats }: DatabaseBackupCardProps) {
  const { langMode } = useDeskLanguage();
  const [isDownloadingSql, setIsDownloadingSql] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  function handleDownloadSql() {
    setIsDownloadingSql(true);
    const toastId = toast.loading(
      resolveLabel(
        { zh: "正在生成完整数据库备份 (.sql)...", en: "Generating full database backup (.sql)..." },
        langMode
      )
    );

    try {
      const link = document.createElement("a");
      link.href = "/api/admin/backup-sql";
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsDownloadingSql(false);
        toast.success(
          resolveLabel(
            {
              zh: "数据库备份下载成功！可在 Supabase 或任意 Postgres 随时恢复",
              en: "Database backup downloaded! Ready to restore in Supabase or any Postgres.",
            },
            langMode
          ),
          { id: toastId }
        );
      }, 1200);
    } catch {
      setIsDownloadingSql(false);
      toast.error(
        resolveLabel({ zh: "下载失败，请重试", en: "Download failed. Please try again." }, langMode),
        { id: toastId }
      );
    }
  }

  function handleDownloadCsv() {
    setIsDownloadingCsv(true);
    const toastId = toast.loading(
      resolveLabel(
        { zh: "正在导出全部历史销售账单 (CSV)...", en: "Exporting sales transaction history (CSV)..." },
        langMode
      )
    );

    try {
      const link = document.createElement("a");
      link.href = "/api/admin/export-sales";
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsDownloadingCsv(false);
        toast.success(
          resolveLabel(
            { zh: "历史销售账单导出成功！", en: "Sales report exported successfully!" },
            langMode
          ),
          { id: toastId }
        );
      }, 1000);
    } catch {
      setIsDownloadingCsv(false);
      toast.error(
        resolveLabel({ zh: "导出失败，请重试", en: "Export failed. Please try again." }, langMode),
        { id: toastId }
      );
    }
  }

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {resolveLabel(
                { zh: "数据库备份与数据导出", en: "Database Backup & Export" },
                langMode
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {resolveLabel(
                {
                  zh: "一键下载完整 PostgreSQL `.sql` 文件或 Excel 销售账单，防范云端故障与误删风险",
                  en: "Download full PostgreSQL `.sql` dump or Excel sales transactions to protect against data loss",
                },
                langMode
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Database Snapshot Counts */}
        {initialStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
              <span className="text-xs text-muted-foreground block font-medium">
                {resolveLabel({ zh: "总记录数", en: "Total Records" }, langMode)}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {initialStats.totalRecords}
              </span>
              <span className="text-2xs text-muted-foreground block mt-0.5">
                {resolveLabel({ zh: "跨 10 张核心表", en: "Across 10 Tables" }, langMode)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
              <span className="text-xs text-muted-foreground block font-medium">
                {resolveLabel({ zh: "开单销售", en: "Sales Transactions" }, langMode)}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {initialStats.bookingsCount}
              </span>
              <span className="text-2xs text-muted-foreground block mt-0.5">
                {resolveLabel({ zh: "笔已完成交易", en: "Completed orders" }, langMode)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
              <span className="text-xs text-muted-foreground block font-medium">
                {resolveLabel({ zh: "顾客档案", en: "Customer Profiles" }, langMode)}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {initialStats.customersCount}
              </span>
              <span className="text-2xs text-muted-foreground block mt-0.5">
                {resolveLabel({ zh: "位顾客与电话", en: "Clients on file" }, langMode)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
              <span className="text-xs text-muted-foreground block font-medium">
                {resolveLabel({ zh: "收支开销", en: "Expenses Logged" }, langMode)}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {initialStats.expensesCount}
              </span>
              <span className="text-2xs text-muted-foreground block mt-0.5">
                {resolveLabel({ zh: "笔支出流水", en: "Expense entries" }, langMode)}
              </span>
            </div>
          </div>
        )}

        {/* 1-Click Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Button
            type="button"
            onClick={handleDownloadSql}
            disabled={isDownloadingSql}
            size="lg"
            className="h-14 font-bold bg-foreground text-background hover:bg-foreground/90 gap-2.5 rounded-xl shadow-xs cursor-pointer text-sm sm:text-base justify-start px-4 sm:px-5"
          >
            {isDownloadingSql ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <Download className="h-5 w-5 shrink-0 text-emerald-400" />
            )}
            <div className="text-left">
              <div className="leading-tight">
                {resolveLabel({ zh: "下载完整数据库备份 (.sql)", en: "Download SQL Database Backup" }, langMode)}
              </div>
              <div className="text-2xs font-normal opacity-80">
                {resolveLabel({ zh: "PostgreSQL Full Dump · 一键还原", en: "PostgreSQL Full Dump · Easy Restore" }, langMode)}
              </div>
            </div>
          </Button>

          <Button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isDownloadingCsv}
            variant="outline"
            size="lg"
            className="h-14 font-bold border-border/80 bg-card hover:bg-muted text-foreground gap-2.5 rounded-xl shadow-xs cursor-pointer text-sm sm:text-base justify-start px-4 sm:px-5"
          >
            {isDownloadingCsv ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <div className="text-left">
              <div className="leading-tight">
                {resolveLabel({ zh: "导出全部历史销售 (CSV)", en: "Export Sales History (CSV)" }, langMode)}
              </div>
              <div className="text-2xs font-normal text-muted-foreground">
                {resolveLabel({ zh: "Excel / Google Sheets 直接打开", en: "Compatible with Excel & Sheets" }, langMode)}
              </div>
            </div>
          </Button>
        </div>

        {/* Automated Daily GitHub Actions Status Banner */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span>
                {resolveLabel(
                  { zh: "GitHub Actions 每日定时自动备份", en: "Daily Automated GitHub Actions Backup" },
                  langMode
                )}
              </span>
              <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                {resolveLabel({ zh: "已就绪", en: "Active" }, langMode)}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {resolveLabel(
                {
                  zh: "系统已配置每日午夜 00:00 (GMT+8) 自动化运行 pg_dump，生成带有时间戳的压缩备份文件（.sql.gz），并自动保存在 GitHub Artifacts 中（保留 60 天）。",
                  en: "Automated daily midnight (GMT+8) pg_dump runs via GitHub Actions, saving compressed timestamped backups (.sql.gz) for 60 days.",
                },
                langMode
              )}
            </p>
          </div>
        </div>

        {/* How to restore instructions */}
        <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs text-muted-foreground">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" />
            <span>
              {resolveLabel(
                { zh: "如何使用下载的 .sql 文件进行数据库恢复？", en: "How to restore using the downloaded .sql file?" },
                langMode
              )}
            </span>
          </div>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed pl-1">
            <li>
              {resolveLabel(
                {
                  zh: "打开 Supabase 控制台或任意 PostgreSQL 管理工具（如 pgAdmin、DBeaver、Neon）。",
                  en: "Open Supabase Dashboard or any PostgreSQL client (e.g. pgAdmin, DBeaver, Neon).",
                },
                langMode
              )}
            </li>
            <li>
              {resolveLabel(
                { zh: "进入 SQL Editor 页面。", en: "Navigate to the SQL Editor." },
                langMode
              )}
            </li>
            <li>
              {resolveLabel(
                {
                  zh: "将下载的 salon_backup_*.sql 文件内容复制粘贴进去，点击 Run 即可完整还原所有表与销售记录。",
                  en: "Paste the contents of salon_backup_*.sql and click Run to restore all tables and records.",
                },
                langMode
              )}
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
