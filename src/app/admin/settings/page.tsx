import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getBusinessSchedules, getTimeBlockouts } from "@/actions/schedule";
import { getDepositSetting } from "@/actions/deposit";
import { getDepositExemptCustomers } from "@/actions/deposit-exempt";
import { getAdminPin } from "@/actions/auth";
import { getDatabaseBackupStats } from "@/actions/backup";
import { BusinessHoursForm } from "@/components/admin/BusinessHoursForm";
import { BlockoutManager } from "@/components/admin/BlockoutManager";
import { DepositSettingsForm } from "@/components/admin/DepositSettingsForm";
import { DeskScoreboardSettingsForm } from "@/components/admin/DeskScoreboardSettingsForm";
import { DepositExemptManager } from "@/components/admin/DepositExemptManager";
import { AdminPinSettingsForm } from "@/components/admin/AdminPinSettingsForm";
import { DatabaseBackupCard } from "@/components/admin/DatabaseBackupCard";
import { Separator } from "@/components/ui/separator";
import { resolveLabel } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const [scheduleResult, blockoutsResult, depositResult, exemptResult, pinResult, statsResult] =
    await Promise.all([
      getBusinessSchedules(),
      getTimeBlockouts(),
      getDepositSetting(),
      getDepositExemptCustomers(),
      getAdminPin(),
      getDatabaseBackupStats(),
    ]);

  const schedules = scheduleResult.success ? scheduleResult.data : [];
  const blockouts = blockoutsResult.success ? blockoutsResult.data : [];
  const exemptCustomers = exemptResult.success ? exemptResult.data : [];
  const currentPin = pinResult.success ? pinResult.data : "1234";
  const backupStats = statsResult.success ? statsResult.data : undefined;
  const depositSetting = depositResult.success
    ? depositResult.data
    : {
        isEnabled: false,
        type: "FIXED" as const,
        amountCents: 1000,
        percentage: 20,
        duitnowPayload: null,
        qrImageUrl: null,
        recipientName: "TEOH CHUN SEONG",
        currency: "MYR",
        currencySymbol: "RM",
        deskLanguage: "ONLY_EN" as const,
        showTodaySales: true,
        showYesterdaySales: true,
        showMonthlySales: true,
        showServiceBreakdown: true,
        showMakeAppointment: true,
        showWalkIn: true,
        showBookedCheckout: true,
      };

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const activeLang: DeskLanguageMode =
    cookieLang || depositSetting.deskLanguage || "ONLY_EN";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {resolveLabel({ zh: "系统设置", en: "Settings" }, activeLang)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {resolveLabel(
            {
              zh: "配置定金收取、熟客免定金名单、前台看板、营业时间与不可预约时段",
              en: "Configure deposits, regular customer exemptions, desk scoreboard, business hours, and calendar availability",
            },
            activeLang
          )}
        </p>
      </div>

      {/* Salon Desk Scoreboard Display Controls */}
      <section className="space-y-4">
        <DeskScoreboardSettingsForm initialSetting={depositSetting} />
      </section>

      {/* 4-Digit Passcode & Security */}
      <section className="space-y-4">
        <AdminPinSettingsForm currentPin={currentPin} />
      </section>

      {/* Database Backup & Data Export */}
      <section className="space-y-4">
        <DatabaseBackupCard initialStats={backupStats} />
      </section>

      {/* Deposit & DuitNow QR */}
      <section className="space-y-4">
        <DepositSettingsForm initialSetting={depositSetting} />
      </section>

      {/* Regular Customer Exemption (Verify phone numbers to exclude deposit) */}
      <section className="space-y-4">
        <DepositExemptManager initialCustomers={exemptCustomers} />
      </section>

      <Separator />

      {/* Business hours */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {resolveLabel({ zh: "营业时间", en: "Business Hours" }, activeLang)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {resolveLabel(
              {
                zh: "设置每周各天营业时间与休息日",
                en: "Set your operating hours per day of week",
              },
              activeLang
            )}
          </p>
        </div>
        <BusinessHoursForm initialSchedules={schedules} />
      </section>

      <Separator />

      {/* Blockouts */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {resolveLabel({ zh: "临时休息与不可预约时段", en: "Time Blockouts" }, activeLang)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {resolveLabel(
              {
                zh: "屏蔽特定日期或时间段（如假期、突发休息等）",
                en: "Block off specific date/time ranges (holidays, breaks, etc.)",
              },
              activeLang
            )}
          </p>
        </div>
        <BlockoutManager initialBlockouts={blockouts} />
      </section>
    </div>
  );
}
