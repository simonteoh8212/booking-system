import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import {
  getMembers,
  getPromoPackages,
  getMemberCreditSummary,
} from "@/actions/members";
import { getServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { MemberManager } from "@/components/admin/MemberManager";
import { normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  await connection();
  const [membersRes, promosRes, servicesRes, depositRes, summaryRes, cookieStore] =
    await Promise.all([
      getMembers({ page: 1, pageSize: 25 }),
      getPromoPackages(),
      getServices(),
      getDepositSetting(),
      getMemberCreditSummary(),
      cookies(),
    ]);

  const membersData = membersRes.success
    ? membersRes.data
    : { members: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  const promos = promosRes.success ? promosRes.data : [];
  const services = servicesRes.success ? servicesRes.data : [];
  const currencySymbol = depositRes.success ? depositRes.data.currencySymbol : "RM";
  const initialSummary = summaryRes.success ? summaryRes.data : undefined;
  const cookieLang = cookieStore.get("app_desk_language")?.value as
    | DeskLanguageMode
    | undefined;
  const initialLanguage: DeskLanguageMode = normalizeDeskLanguageMode(cookieLang);

  return (
    <MemberManager
      initialMembers={membersData.members}
      initialTotalMembers={membersData.total}
      initialPage={membersData.page}
      pageSize={membersData.pageSize}
      initialPromos={promos}
      services={services}
      currencySymbol={currencySymbol}
      initialLanguage={initialLanguage}
      initialSummary={initialSummary}
    />
  );
}
