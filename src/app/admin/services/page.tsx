import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { ServiceManager } from "@/components/admin/ServiceManager";
import type { DeskLanguageMode } from "@/types";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";

export const metadata: Metadata = { title: "Catalog" };

export default async function ServicesPage() {
  await connection();
  const [result, depositRes, cookieStore] = await Promise.all([
    getServices(),
    getDepositSetting(),
    cookies(),
  ]);

  const services = result.success ? result.data : [];
  const currencySymbol = depositRes.success ? depositRes.data.currencySymbol : "RM";
  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);
  const isZh = initialLanguage === "ONLY_ZH";

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        {isZh ? "服务与商品" : "Catalog"}
      </h1>

      <ServiceManager
        initialServices={services}
        currencySymbol={currencySymbol}
        initialLanguage={initialLanguage}
      />
    </div>
  );
}
