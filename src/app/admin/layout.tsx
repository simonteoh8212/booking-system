import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminNav } from "@/components/admin/AdminNav";
import type { DeskLanguageMode } from "@/types";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | BookEase Admin",
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
    <div className="min-h-screen bg-muted/30">
      <AdminNav initialLanguage={initialLanguage} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
