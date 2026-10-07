import type { Metadata } from "next";
import { getBusinessSchedules, getTimeBlockouts } from "@/actions/schedule";
import { BusinessHoursForm } from "@/components/admin/BusinessHoursForm";
import { BlockoutManager } from "@/components/admin/BlockoutManager";
import { Separator } from "@/components/ui/separator";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const [scheduleResult, blockoutsResult] = await Promise.all([
    getBusinessSchedules(),
    getTimeBlockouts(),
  ]);

  const schedules = scheduleResult.success ? scheduleResult.data : [];
  const blockouts = blockoutsResult.success ? blockoutsResult.data : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your business hours and availability
        </p>
      </div>

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
