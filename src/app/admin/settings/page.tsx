import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getBusinessSchedules, getTimeBlockouts } from "@/actions/schedule";
import { getDepositSetting } from "@/actions/deposit";
import { getDepositExemptCustomers } from "@/actions/deposit-exempt";
import { getAdminPin, getRecoveryCodeStatus } from "@/actions/auth";
import { getDatabaseBackupStats } from "@/actions/backup";
import { BusinessHoursForm } from "@/components/admin/BusinessHoursForm";
import { BlockoutManager } from "@/components/admin/BlockoutManager";
import { DepositSettingsForm } from "@/components/admin/DepositSettingsForm";
import { DeskScoreboardSettingsForm } from "@/components/admin/DeskScoreboardSettingsForm";
import { DepositExemptManager } from "@/components/admin/DepositExemptManager";
import { AdminPinSettingsForm } from "@/components/admin/AdminPinSettingsForm";
import { AdminPasswordSettingsForm } from "@/components/admin/AdminPasswordSettingsForm";
import { DatabaseBackupCard } from "@/components/admin/DatabaseBackupCard";
import { isInternalAppMode } from "@/lib/utils";
import type { DeskLanguageMode } from "@/types";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const [
    scheduleResult,
    blockoutsResult,
    depositResult,
    exemptResult,
    pinResult,
    recoveryResult,
    statsResult,
  ] = await Promise.all([
    getBusinessSchedules(),
    getTimeBlockouts(),
    getDepositSetting(),
    getDepositExemptCustomers(),
    getAdminPin(),
    getRecoveryCodeStatus(),
    getDatabaseBackupStats(),
  ]);

  const schedules = scheduleResult.success ? scheduleResult.data : [];
  const blockouts = blockoutsResult.success ? blockoutsResult.data : [];
  const exemptCustomers = exemptResult.success ? exemptResult.data : [];
  const currentPin = pinResult.success ? pinResult.data : "";
  const hasRecoveryCode = recoveryResult.success ? recoveryResult.data.hasRecoveryCode : false;
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
        requireReportPin: true,
      };

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const activeLang: DeskLanguageMode = normalizeDeskLanguageMode(
    cookieLang || depositSetting.deskLanguage
  );
  const isZh = activeLang === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        {t("Settings", "系统设置")}
      </h1>

      <section>
        <DeskScoreboardSettingsForm initialSetting={depositSetting} />
      </section>

      <section>
        <AdminPinSettingsForm
          currentPin={currentPin}
          initialRequireReportPin={depositSetting.requireReportPin ?? true}
          initialLanguage={activeLang}
        />
      </section>

      <section>
        <AdminPasswordSettingsForm
          initialHasRecoveryCode={hasRecoveryCode}
          initialLanguage={activeLang}
        />
      </section>

      <section>
        <DatabaseBackupCard initialStats={backupStats} initialLanguage={activeLang} />
      </section>

      {!isInternalAppMode() && (
        <>
          <section>
            <DepositSettingsForm initialSetting={depositSetting} />
          </section>

          <section>
            <DepositExemptManager initialCustomers={exemptCustomers} />
          </section>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          {t("Business Hours", "营业时间")}
        </h2>
        <BusinessHoursForm initialSchedules={schedules} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          {t("Time Blockouts", "不可预约时段")}
        </h2>
        <BlockoutManager initialBlockouts={blockouts} />
      </section>
    </div>
  );
}
