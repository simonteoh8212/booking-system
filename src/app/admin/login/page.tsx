"use client";

import { useState, useTransition, Suspense } from "react";
import { adminLogin } from "@/actions/auth";
import { useSearchParams } from "next/navigation";
import { PinKeypad } from "@/components/admin/PinKeypad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Loader2, Lock, User, KeyRound } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from") || "/admin/desk";

  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminLogin(form);
      if (result.success) {
        window.location.href = fromUrl;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      {mode === "pin" ? (
        <Card className="w-full max-w-sm shadow-2xl border-border/80 p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <CardContent className="pt-4 pb-2">
            <PinKeypad
              onSuccessRedirect={fromUrl}
              onSwitchToPassword={() => setMode("password")}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
                <CalendarDays className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription className="text-sm">
              Sign in with your username & password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    className="pl-9 h-11 text-base font-medium"
                    placeholder="admin"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9 h-11 text-base font-medium"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("pin")}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  Use 4-Digit Passcode instead
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
