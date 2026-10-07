import type { Metadata } from "next";
import { getServices } from "@/actions/services";
import { ServiceManager } from "@/components/admin/ServiceManager";

import { connection } from "next/server";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  await connection();
  const result = await getServices();
  const services = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-muted-foreground text-sm">
          Manage your service catalog
        </p>
      </div>

      <ServiceManager initialServices={services} />
    </div>
  );
}
