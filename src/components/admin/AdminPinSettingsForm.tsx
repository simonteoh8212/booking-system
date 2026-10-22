"use client";

import { useState, useTransition } from "react";
import { updateAdminPin } from "@/actions/auth";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";

interface AdminPinSettingsFormProps {
  currentPin: string;
}

export function AdminPinSettingsForm({ currentPin: initialPin }: AdminPinSettingsFormProps) {
  const { langMode } = useDeskLanguage();
  const [activePin, setActivePin] = useState(initialPin || "1234");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setError(
        resolveLabel(
          { zh: "新密码必须是4位纯数字 (0-9)。", en: "New PIN must be exactly 4 numeric digits (0-9)." },
          langMode
        )
      );
      return;
    }

    if (cleanNewPin !== cleanConfirm) {
      setError(
        resolveLabel(
          { zh: "两次输入的密码不一致，请重新确认。", en: "PIN confirmation does not match. Please try again." },
          langMode
        )
      );
      return;
    }

    startTransition(async () => {
      const res = await updateAdminPin(cleanNewPin);
      if (res.success) {
        setActivePin(cleanNewPin);
        setNewPin("");
        setConfirmPin("");
        toast.success(
          resolveLabel(
            { zh: "4位柜台密码更新成功！", en: "4-digit passcode updated successfully!" },
            langMode
          )
        );
      } else {
        setError(res.error || "Failed to update PIN");
        toast.error(res.error || "Failed to update PIN");
      }
    });
  }

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {resolveLabel({ zh: "4位前台解锁密码", en: "4-Digit Passcode" }, langMode)}
              </CardTitle>
              <CardDescription className="text-sm">
                {resolveLabel(
                  {
                    zh: "用于解锁沙龙前台收银台及查看敏感财务对账单的快捷 PIN 码",
                    en: "Quick passcode for unlocking the Salon Desk and viewing sensitive financial reports",
                  },
                  langMode
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Active PIN badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border/80 gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {resolveLabel({ zh: "当前生效密码", en: "Current Active Passcode" }, langMode)}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-black tracking-widest text-foreground">
                  {showCurrentPin ? activePin : "••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={showCurrentPin ? "Hide PIN" : "Reveal PIN"}
                >
                  {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-xl border shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>{resolveLabel({ zh: "员工前台与财务安全", en: "Staff Desk & Financials" }, langMode)}</span>
            </div>
          </div>

          {/* Change PIN Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPin" className="text-sm font-semibold">
                  {resolveLabel({ zh: "设置新 4 位密码", en: "New 4-Digit PIN" }, langMode)}
                </Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 5678"
                  className="font-mono text-lg tracking-widest h-12"
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setNewPin(val);
                  }}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {resolveLabel({ zh: "必须恰好为 4 位数字", en: "Must be exactly 4 digits" }, langMode)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="text-sm font-semibold">
                  {resolveLabel({ zh: "再次确认新密码", en: "Confirm New PIN" }, langMode)}
                </Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 5678"
                  className="font-mono text-lg tracking-widest h-12"
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setConfirmPin(val);
                  }}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {resolveLabel({ zh: "重新输入以确认", en: "Re-enter the 4 digits to confirm" }, langMode)}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="pt-1">
              <p className="text-xs text-muted-foreground">
                {resolveLabel({ zh: "提示：初始默认密码为", en: "Tip: Default PIN is" }, langMode)}{" "}
                <code className="font-mono font-bold text-foreground">1234</code>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Floating Save Changes Dock */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl transition-all duration-300 ease-out ${
          hasChanges
            ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-y-12 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-foreground text-background dark:bg-card dark:text-foreground dark:border dark:border-border shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">
                {resolveLabel({ zh: "未保存的新密码", en: "Unsaved Changes" }, langMode)}
              </p>
              <p className="text-[11px] opacity-70 hidden sm:block truncate">
                {newPin.length === 4 && confirmPin.length === 4
                  ? resolveLabel({ zh: "新 4 位密码已就绪，点击保存生效。", en: "New 4-digit passcode ready to save." }, langMode)
                  : resolveLabel({ zh: "请输入并确认 4 位数字密码。", en: "Enter and confirm your 4-digit PIN." }, langMode)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleDiscard}
              className="h-9 px-3 text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-background/10 dark:hover:bg-muted cursor-pointer rounded-xl text-inherit"
            >
              {resolveLabel({ zh: "放弃", en: "Discard" }, langMode)}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={isPending || newPin.length !== 4 || confirmPin.length !== 4}
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-bold bg-background text-foreground hover:bg-background/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 shadow-sm cursor-pointer gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {resolveLabel({ zh: "保存中…", en: "Saving..." }, langMode)}
                </>
              ) : (
                resolveLabel({ zh: "保存新密码", en: "Save Changes" }, langMode)
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
