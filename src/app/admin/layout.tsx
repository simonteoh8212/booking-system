import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminNav } from "@/components/admin/AdminNav";
import type { DeskLanguageMode } from "@/types";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | SideBox",
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("app_desk_language")?.value as DeskLanguageMode | undefined;
  const initialLanguage: DeskLanguageMode =
    cookieLang && ["ONLY_EN", "ONLY_ZH", "BILINGUAL_ZH_FIRST", "BILINGUAL_EN_FIRST"].includes(cookieLang)
      ? cookieLang
      : "ONLY_EN";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminNav initialLanguage={initialLanguage} />
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
