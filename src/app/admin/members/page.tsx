import type { Metadata } from "next";
import { connection } from "next/server";
import { getMembers, getPromoPackages } from "@/actions/members";
import { getServices } from "@/actions/services";
import { getDepositSetting } from "@/actions/deposit";
import { MemberManager } from "@/components/admin/MemberManager";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  await connection();
  const [membersRes, promosRes, servicesRes, depositRes] = await Promise.all([
    getMembers(),
    getPromoPackages(),
    getServices(),
    getDepositSetting(),
  ]);

  const members = membersRes.success ? membersRes.data : [];
  const promos = promosRes.success ? promosRes.data : [];
  const services = servicesRes.success ? servicesRes.data : [];
  const currencySymbol = depositRes.success ? depositRes.data.currencySymbol : "RM";

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Members &amp; Promos</h1>

      <MemberManager
        initialMembers={members}
        initialPromos={promos}
        services={services}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
