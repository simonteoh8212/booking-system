import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { verifyTrustedDeviceCookie } from "@/lib/auth";
import { AdminLoginClient } from "@/components/admin/AdminLoginClient";

export default async function AdminLoginPage() {
  const trusted = await verifyTrustedDeviceCookie();

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminLoginClient initialPinEnabled={Boolean(trusted)} />
    </Suspense>
  );
}
