import type { Metadata } from "next";
import { getServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { ServiceManager } from "@/components/admin/ServiceManager";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  await connection();
  const [result, depositRes] = await Promise.all([
    getServices(),
    getDepositSetting(),
  ]);
  const services = result.success ? result.data : [];
  const currencySymbol = depositRes.success ? depositRes.data.currencySymbol : "RM";

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Catalog</h1>

      <ServiceManager initialServices={services} currencySymbol={currencySymbol} />
    </div>
  );
}
