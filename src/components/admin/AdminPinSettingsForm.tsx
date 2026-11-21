"use client";

import { useState, useTransition } from "react";
import { updateAdminPin, updateReportPinRequirement } from "@/actions/auth";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Lock, Unlock, ShieldAlert, Loader2 } from "lucide-react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { FloatingSaveBtn } from "@/components/admin/FloatingSaveBtn";
import type { DeskLanguageMode } from "@/types";

interface AdminPinSettingsFormProps {
  currentPin: string;
  initialRequireReportPin?: boolean;
  initialLanguage?: DeskLanguageMode;
}

export function AdminPinSettingsForm({
  currentPin: initialPin,
  initialRequireReportPin = true,
  initialLanguage = "ONLY_EN",
}: AdminPinSettingsFormProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [activePin, setActivePin] = useState(initialPin || "");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Monthly Financial Report PIN lock toggle state
  const [requireReportPin, setRequireReportPin] = useState<boolean>(initialRequireReportPin);
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const hasChanges = Boolean(newPin.length > 0 || confirmPin.length > 0);

  function handleDiscard() {
    setNewPin("");
    setConfirmPin("");
    setError(null);
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    const cleanNewPin = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!/^\d{4}$/.test(cleanNewPin)) {
      setError(t("PIN must be 4 numeric digits.", "密码必须为 4 位数字。"));
      return;
    }

    if (cleanNewPin !== cleanConfirm) {
      setError(t("PIN confirmation does not match.", "两次输入的密码不一致。"));
      return;
    }

    startTransition(async () => {
      const res = await updateAdminPin(cleanNewPin);
      if (res.success) {
        setActivePin(cleanNewPin);
        setNewPin("");
        setConfirmPin("");
        toast.success(t("Passcode updated.", "密码已更新。"));
      } else {
        setError(res.error || t("Failed to update PIN.", "更新密码失败。"));
        toast.error(res.error || t("Failed to update PIN.", "更新密码失败。"));
      }
    });
  }

  function handleToggleReportPin() {
    if (requireReportPin) {
      // ON -> OFF requires account password verification
      setVerifyPassword("");
      setShowVerifyPassword(false);
      setVerifyError(null);
      setIsDisableModalOpen(true);
      return;
    }

    // OFF -> ON activates immediately (server checks a 4-digit PIN is set)
    startToggleTransition(async () => {
      const res = await updateReportPinRequirement({ requirePin: true });
      if (res.success) {
        setRequireReportPin(res.data.requireReportPin);
        try {
          sessionStorage.removeItem("desk_finance_unlocked");
        } catch {}
        toast.success(t("Monthly report PIN lock enabled.", "已开启月度报表密码保护。"));
      } else {
        toast.error(res.error || t("Failed to enable report PIN lock.", "开启报表密码保护失败。"));
      }
    });
  }

  function handleConfirmDisableReportPin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setVerifyError(null);

    if (!verifyPassword.trim()) {
      setVerifyError(t("Please enter your account password.", "请输入您的登录密码。"));
      return;
    }

    startToggleTransition(async () => {
      const res = await updateReportPinRequirement({
        requirePin: false,
        password: verifyPassword,
      });
      if (res.success) {
        setRequireReportPin(res.data.requireReportPin);
        setIsDisableModalOpen(false);
        setVerifyPassword("");
        setVerifyError(null);
        toast.success(t("Monthly report PIN lock disabled.", "已关闭月度报表密码保护。"));
      } else {
        setVerifyError(res.error || t("Incorrect password.", "登录密码错误。"));
      }
    });
  }

  return (
    <>
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary shrink-0" />
            <span suppressHydrationWarning>{t("4-Digit Passcode", "4 位解锁密码")}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs font-medium text-muted-foreground" suppressHydrationWarning>
              {t("Active Passcode", "当前密码")}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-widest text-foreground">
                {activePin ? (showCurrentPin ? activePin : "••••") : t("Not set", "未设置")}
              </span>
              {activePin && (
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showCurrentPin ? "Hide PIN" : "Reveal PIN"}
                >
                  {showCurrentPin ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4 text-primary" />
                  )}
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newPin" className="text-xs font-semibold" suppressHydrationWarning>
                  {t("New PIN", "新密码")}
                </Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="font-mono text-base tracking-widest h-10"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPin" className="text-xs font-semibold" suppressHydrationWarning>
                  {t("Confirm PIN", "确认密码")}
                </Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="font-mono text-base tracking-widest h-10"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
                {error}
              </div>
            )}
          </form>

          {/* Optional PIN lock toggle for Monthly Financial Report */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              role="switch"
              aria-checked={requireReportPin}
              disabled={isTogglePending}
              onClick={handleToggleReportPin}
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 cursor-pointer text-left disabled:opacity-60"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {requireReportPin ? (
                  <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Unlock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground" suppressHydrationWarning>
                      {t("Require PIN for Monthly Financial Report", "查看月度财务报表需验证 4 位密码")}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        requireReportPin
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                      suppressHydrationWarning
                    >
                      {requireReportPin ? t("Protected", "已保护") : t("Unlocked", "未锁定")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed" suppressHydrationWarning>
                    {requireReportPin
                      ? t(
                          "Staff must enter the 4-digit PIN before viewing monthly revenue, expenses, and net profit on Salon Desk. Turning this off requires your login password.",
                          "前台查看月度营业额、支出与净利润前须输入 4 位数字密码。关闭此保护需验证管理员登录密码。"
                        )
                      : t(
                          "Anyone using Salon Desk can open Monthly Financial Report directly without entering a PIN.",
                          "任何在前台操作的人员均无需密码即可直接查看月度财务报表。"
                        )}
                  </p>
                </div>
              </div>

              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  requireReportPin ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    requireReportPin ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Password Confirmation Dialog when Disabling Report PIN Lock */}
      <Dialog
        open={isDisableModalOpen}
        onOpenChange={(open) => {
          if (!isTogglePending) {
            setIsDisableModalOpen(open);
            if (!open) {
              setVerifyPassword("");
              setVerifyError(null);
            }
          }
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl p-5 sm:p-6 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <span suppressHydrationWarning>
                {t("Verify Account Password", "验证管理员登录密码")}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed" suppressHydrationWarning>
              {t(
                "Disabling the PIN lock allows anyone at Salon Desk to view monthly revenue, expenses, and net profit without entering a PIN. Enter your login password to confirm.",
                "关闭密码保护后，任何前台操作人员无需密码即可查看月度营收、支出及净利润。请输入您的登录密码以确认关闭。"
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDisableReportPin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="verifyReportPinPassword" className="text-xs font-semibold" suppressHydrationWarning>
                {t("Account Password", "登录密码")}
              </Label>
              <div className="relative">
                <Input
                  id="verifyReportPinPassword"
                  type={showVerifyPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("Enter your login password", "请输入登录密码")}
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  disabled={isTogglePending}
                  className="h-11 sm:h-10 pr-11 text-base sm:text-sm rounded-xl"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyPassword((prev) => !prev)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label={showVerifyPassword ? "Hide password" : "Show password"}
                >
                  {showVerifyPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
                {verifyError}
              </div>
            )}

            <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 gap-2.5 px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisableModalOpen(false)}
                disabled={isTogglePending}
                className="h-10 sm:h-9 w-full sm:w-auto text-sm font-semibold rounded-xl cursor-pointer"
              >
                {t("Cancel", "取消")}
              </Button>
              <Button
                type="submit"
                disabled={isTogglePending || !verifyPassword.trim()}
                className="h-10 sm:h-9 w-full sm:w-auto text-sm font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                {isTogglePending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t("Disable PIN Lock", "确认关闭保护")}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FloatingSaveBtn
        show={hasChanges}
        onSave={() => handleSubmit()}
        onDiscard={handleDiscard}
        isPending={isPending}
        disabled={newPin.length !== 4 || confirmPin.length !== 4}
        title={t("Unsaved Passcode", "未保存的密码")}
        description={
          newPin.length === 4 && confirmPin.length === 4
            ? t("Ready to save.", "点击保存生效。")
            : t("Enter 4 digits in both fields.", "请输入并确认 4 位数字。")
        }
        saveText={t("Save", "保存")}
        langMode={langMode}
      />
    </>
  );
}
