import type { Metadata } from "next";
import { getBusinessSchedules, getTimeBlockouts } from "@/actions/schedule";
import { getDepositSetting } from "@/actions/deposit";
import { BusinessHoursForm } from "@/components/admin/BusinessHoursForm";
import { BlockoutManager } from "@/components/admin/BlockoutManager";
import { DepositSettingsForm } from "@/components/admin/DepositSettingsForm";
import { Separator } from "@/components/ui/separator";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const [scheduleResult, blockoutsResult, depositResult] = await Promise.all([
    getBusinessSchedules(),
    getTimeBlockouts(),
    getDepositSetting(),
  ]);

  const schedules = scheduleResult.success ? scheduleResult.data : [];
  const blockouts = blockoutsResult.success ? blockoutsResult.data : [];
  const depositSetting = depositResult.success
    ? depositResult.data
    : {
        isEnabled: false,
        type: "FIXED" as const,
        amountCents: 1000,
        percentage: 20,
        duitnowPayload: null,
        recipientName: "TEOH CHUN SEONG",
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure deposits, business hours, and calendar availability
        </p>
      </div>

      {/* Deposit & DuitNow QR */}
      <section className="space-y-4">
        <DepositSettingsForm initialSetting={depositSetting} />
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
