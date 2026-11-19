"use client";

import { useState, useTransition } from "react";
import {
  updateAdminPassword,
  regenerateRecoveryCode,
} from "@/actions/auth";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import type { DeskLanguageMode } from "@/types";

interface AdminPasswordSettingsFormProps {
  initialHasRecoveryCode: boolean;
  initialLanguage?: DeskLanguageMode;
}

export function AdminPasswordSettingsForm({
  initialHasRecoveryCode,
  initialLanguage = "ONLY_EN",
}: AdminPasswordSettingsFormProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [hasRecoveryCode, setHasRecoveryCode] = useState(initialHasRecoveryCode);
  const [revealedRecoveryCode, setRevealedRecoveryCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(t("Current password is required.", "请输入当前登录密码。"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("New password must be at least 8 characters.", "新密码至少需要 8 位字符。"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("Password confirmation does not match.", "两次输入的新密码不一致。"));
      return;
    }

    startTransition(async () => {
      const res = await updateAdminPassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(t("Login password updated.", "登录密码已更新。"));
        if (res.data.initialRecoveryCode) {
          setHasRecoveryCode(true);
          setRevealedRecoveryCode(res.data.initialRecoveryCode);
        }
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  async function handleGenerateRecoveryCode() {
    setIsGeneratingCode(true);
    try {
      const res = await regenerateRecoveryCode();
      if (res.success) {
        setHasRecoveryCode(true);
        setRevealedRecoveryCode(res.data.recoveryCode);
        setCopiedCode(false);
        toast.success(
          t("New recovery code generated. Save it safely.", "已生成新恢复码，请妥善保存。")
        );
      } else {
        toast.error(res.error);
      }
    } finally {
      setIsGeneratingCode(false);
    }
  }

  async function handleCopyCode() {
    if (!revealedRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(revealedRecoveryCode);
      setCopiedCode(true);
      toast.success(t("Recovery code copied.", "恢复码已复制。"));
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(t("Failed to copy.", "复制失败，请手动记录。"));
    }
  }

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <span suppressHydrationWarning>
            {t("Login Password & Recovery Code", "登录密码与恢复码")}
          </span>
        </CardTitle>
        <CardDescription className="text-xs" suppressHydrationWarning>
          {t(
            "Change your account password anytime and keep a one-time recovery code in case you log out and forget your password.",
            "可随时修改登录密码；同时保存一次性恢复码，避免退出登录后忘记密码无法进入。"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-semibold" suppressHydrationWarning>
              {t("Current Password", "当前密码")}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10 h-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-semibold" suppressHydrationWarning>
                {t("New Password (min 8 chars)", "新密码（至少 8 位）")}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 h-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold" suppressHydrationWarning>
                {t("Confirm New Password", "确认新密码")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 h-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg font-semibold cursor-pointer"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              <span suppressHydrationWarning>{t("Update Password", "保存新密码")}</span>
            </Button>
          </div>
        </form>

        {/* Self-Service Recovery Code Box */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold" suppressHydrationWarning>
                {t("Backup Recovery Code", "备用恢复码")}
              </span>
              <Badge variant={hasRecoveryCode ? "secondary" : "outline"} className="text-[11px]">
                {hasRecoveryCode
                  ? t("Configured", "已设置")
                  : t("Not set", "未生成")}
              </Badge>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateRecoveryCode}
              disabled={isGeneratingCode}
              className="h-8 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {isGeneratingCode ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span suppressHydrationWarning>
                {hasRecoveryCode
                  ? t("Rotate Recovery Code", "重新生成恢复码")
                  : t("Generate Recovery Code", "生成恢复码")}
              </span>
            </Button>
          </div>

          {revealedRecoveryCode && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                {t(
                  "Save or screenshot this code now — it will not be shown again. Use it on the login page if you ever forget your password.",
                  "请立即截图或抄下此恢复码（离开页面后将不再显示）。忘记密码时可在登录页使用它重设密码。"
                )}
              </p>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border">
                <code className="font-mono text-base font-bold tracking-widest text-foreground">
                  {revealedRecoveryCode}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedCode ? t("Copied", "已复制") : t("Copy", "复制")}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
