import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getMembers, getPromoPackages } from "@/actions/members";
import { getServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { MemberManager } from "@/components/admin/MemberManager";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  await connection();
  const [membersRes, promosRes, servicesRes, depositRes, cookieStore] = await Promise.all([
    getMembers(),
    getPromoPackages(),
    getServices(),
    getDepositSetting(),
    cookies(),
  ]);

  const members = membersRes.success ? membersRes.data : [];
  const promos = promosRes.success ? promosRes.data : [];
  const services = servicesRes.success ? servicesRes.data : [];
  const currencySymbol = depositRes.success ? depositRes.data.currencySymbol : "RM";
  const cookieLang = cookieStore.get("app_desk_language")?.value as
    | DeskLanguageMode
    | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);

  return (
    <MemberManager
      initialMembers={members}
      initialPromos={promos}
      services={services}
      currencySymbol={currencySymbol}
      initialLanguage={initialLanguage}
    />
  );
}
