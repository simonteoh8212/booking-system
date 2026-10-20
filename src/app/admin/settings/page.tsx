import type { Metadata } from "next";
import { getBusinessSchedules, getTimeBlockouts } from "@/actions/schedule";
import { getDepositSetting } from "@/actions/deposit";
import { getDepositExemptCustomers } from "@/actions/deposit-exempt";
import { BusinessHoursForm } from "@/components/admin/BusinessHoursForm";
import { BlockoutManager } from "@/components/admin/BlockoutManager";
import { DepositSettingsForm } from "@/components/admin/DepositSettingsForm";
import { DepositExemptManager } from "@/components/admin/DepositExemptManager";
import { Separator } from "@/components/ui/separator";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const [scheduleResult, blockoutsResult, depositResult, exemptResult] = await Promise.all([
    getBusinessSchedules(),
    getTimeBlockouts(),
    getDepositSetting(),
    getDepositExemptCustomers(),
  ]);

  const schedules = scheduleResult.success ? scheduleResult.data : [];
  const blockouts = blockoutsResult.success ? blockoutsResult.data : [];
  const exemptCustomers = exemptResult.success ? exemptResult.data : [];
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
        deskLanguage: "BILINGUAL_ZH_FIRST" as const,
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure deposits, regular customer exemptions, business hours, and calendar availability
        </p>
      </div>

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
          <h2 className="text-lg font-semibold">Business Hours</h2>
          <p className="text-sm text-muted-foreground">
            Set your operating hours per day of week
          </p>
        </div>
        <BusinessHoursForm initialSchedules={schedules} />
      </section>

      <Separator />

      {/* Blockouts */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Time Blockouts</h2>
          <p className="text-sm text-muted-foreground">
            Block off specific date/time ranges (holidays, breaks, etc.)
          </p>
        </div>
        <BlockoutManager initialBlockouts={blockouts} />
      </section>
    </div>
  );
}
