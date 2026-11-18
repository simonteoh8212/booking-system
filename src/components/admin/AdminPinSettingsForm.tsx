"use client";

import { useState, useTransition } from "react";
import { updateAdminPin } from "@/actions/auth";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { FloatingSaveBtn } from "@/components/admin/FloatingSaveBtn";
import type { DeskLanguageMode } from "@/types";

interface AdminPinSettingsFormProps {
  currentPin: string;
  initialLanguage?: DeskLanguageMode;
}

export function AdminPinSettingsForm({
  currentPin: initialPin,
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
        </CardContent>
      </Card>

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
