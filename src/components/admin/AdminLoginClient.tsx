"use client";

import { useState, useTransition, useEffect } from "react";
import { adminLogin, resetPasswordWithRecoveryCode } from "@/actions/auth";
import { useSearchParams } from "next/navigation";
import { PinKeypad } from "@/components/admin/PinKeypad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Box,
  Loader2,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import { isInternalAppMode } from "@/lib/utils";

interface AdminLoginClientProps {
  initialPinEnabled: boolean;
}

export function AdminLoginClient({ initialPinEnabled }: AdminLoginClientProps) {
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from");
  const isInternal = isInternalAppMode();
  const defaultDestination = isInternal ? "/admin/desk" : "/admin";
  const fromUrl = isInternal
    ? (rawFrom && rawFrom !== "/admin" && rawFrom !== "/" ? rawFrom : defaultDestination)
    : (rawFrom && rawFrom !== "/" ? rawFrom : defaultDestination);

  const [mode, setMode] = useState<"pin" | "password" | "recovery">(
    initialPinEnabled ? "pin" : "password"
  );
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({
    username: "admin",
    recoveryCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rotatedCode, setRotatedCode] = useState<string | null>(null);
  const [copiedRotated, setCopiedRotated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Prevent any document scrolling and overscroll bounce on the passcode/login screen
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.overscrollBehavior = origOverscroll;
    };
  }, []);

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

  function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (recoveryForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (recoveryForm.newPassword !== recoveryForm.confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordWithRecoveryCode({
        username: recoveryForm.username,
        recoveryCode: recoveryForm.recoveryCode,
        newPassword: recoveryForm.newPassword,
      });

      if (result.success) {
        setRotatedCode(result.data.newRecoveryCode);
        setCopiedRotated(false);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopyRotatedCode() {
    if (!rotatedCode) return;
    try {
      await navigator.clipboard.writeText(rotatedCode);
      setCopiedRotated(true);
      setTimeout(() => setCopiedRotated(false), 2000);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 p-4 overflow-hidden overscroll-none select-none">
      {mode === "pin" && initialPinEnabled ? (
        <div className="w-full max-w-xs mx-auto flex flex-col items-center justify-center animate-in fade-in duration-300">
          <PinKeypad
            onSuccessRedirect={fromUrl}
            onSwitchToPassword={() => setMode("password")}
          />
        </div>
      ) : mode === "recovery" ? (
        <Card className="w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">
              {rotatedCode ? "Password Reset Complete" : "Reset with Recovery Code"}
            </CardTitle>
            <CardDescription className="text-xs">
              {rotatedCode
                ? "Your password is updated and you are signed in. Save your new replacement recovery code below."
                : "Enter your username, backup recovery code, and a new password."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {rotatedCode ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Your previous code is now invalid. Save or screenshot this new code for future resets:
                  </p>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border">
                    <code className="font-mono text-base font-bold tracking-widest text-foreground">
                      {rotatedCode}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyRotatedCode}
                      className="h-7 px-2 text-xs gap-1 cursor-pointer"
                    >
                      {copiedRotated ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedRotated ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = fromUrl;
                  }}
                  className="w-full h-11 text-sm font-semibold cursor-pointer"
                >
                  Continue to Salon
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-username" className="text-xs font-semibold">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rec-username"
                      type="text"
                      className="pl-9 h-10 text-sm font-medium"
                      value={recoveryForm.username}
                      onChange={(e) =>
                        setRecoveryForm({ ...recoveryForm, username: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rec-code" className="text-xs font-semibold">
                    Recovery Code
                  </Label>
                  <Input
                    id="rec-code"
                    type="text"
                    placeholder="XXXX-XXXX-XXXX"
                    className="h-10 font-mono text-sm uppercase tracking-wider"
                    value={recoveryForm.recoveryCode}
                    onChange={(e) =>
                      setRecoveryForm({ ...recoveryForm, recoveryCode: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rec-new-pw" className="text-xs font-semibold">
                    New Password (min 8 chars)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rec-new-pw"
                      type={showNewPassword ? "text" : "password"}
                      className="pl-9 pr-10 h-10 text-sm font-medium"
                      placeholder="••••••••"
                      value={recoveryForm.newPassword}
                      onChange={(e) =>
                        setRecoveryForm({ ...recoveryForm, newPassword: e.target.value })
                      }
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rec-confirm-pw" className="text-xs font-semibold">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rec-confirm-pw"
                      type={showConfirmPassword ? "text" : "password"}
                      className="pl-9 pr-10 h-10 text-sm font-medium"
                      placeholder="••••••••"
                      value={recoveryForm.confirmPassword}
                      onChange={(e) =>
                        setRecoveryForm({
                          ...recoveryForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    "Reset Password & Sign In"
                  )}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode("password");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
                <Box className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">SideBox Sign In</CardTitle>
            <CardDescription className="text-sm">
              Sign in with your username &amp; password (stays signed in for 30 days)
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
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10 h-11 text-base font-medium"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
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

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setRotatedCode(null);
                    setRecoveryForm((prev) => ({
                      ...prev,
                      username: form.username.trim() || prev.username || "admin",
                    }));
                    setMode("recovery");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline font-medium cursor-pointer"
                >
                  Forgot password? Use recovery code
                </button>

                {initialPinEnabled && (
                  <button
                    type="button"
                    onClick={() => setMode("pin")}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    Use 4-Digit Passcode instead
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
