"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateDepositSetting, getPreviewDepositQR } from "@/actions/deposit";
import { parseDuitNowPayload, DEFAULT_DUITNOW_PAYLOAD } from "@/lib/duitnow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DepositSettingDto, DeskLanguageMode } from "@/types";
import { DESK_LANGUAGE_OPTIONS, resolveLabel } from "@/lib/desk-i18n";
import { useDeskLanguage, saveDeskLanguage } from "@/lib/use-desk-language";
import jsQR from "jsqr";
import {
  Wallet,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  RefreshCw,
  Sparkles,
  Info,
  DollarSign,
  Percent,
  Languages,
} from "lucide-react";

interface DepositSettingsFormProps {
  initialSetting: DepositSettingDto;
}

export function DepositSettingsForm({ initialSetting }: DepositSettingsFormProps) {
  const router = useRouter();
  const { langMode, setLangMode } = useDeskLanguage(initialSetting.deskLanguage);
  const [currency, setCurrency] = useState<string>(initialSetting.currency || "MYR");
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialSetting.currencySymbol || "RM");
  const [deskLanguage, setDeskLanguage] = useState<DeskLanguageMode>(
    langMode || initialSetting.deskLanguage || "BILINGUAL_ZH_FIRST"
  );

  // Keep deskLanguage synchronized with active global language mode
  useEffect(() => {
    if (langMode && langMode !== deskLanguage) {
      setDeskLanguage(langMode);
    }
  }, [langMode, deskLanguage]);

  const [isEnabled, setIsEnabled] = useState(initialSetting.isEnabled);
  const [type, setType] = useState<"FIXED" | "PERCENTAGE">(initialSetting.type);
  const [amountRm, setAmountRm] = useState((initialSetting.amountCents / 100).toFixed(2));
  const [percentage, setPercentage] = useState(String(initialSetting.percentage || 20));
  const [duitnowPayload, setDuitnowPayload] = useState(
    initialSetting.duitnowPayload || DEFAULT_DUITNOW_PAYLOAD
  );
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(
    initialSetting.qrImageUrl || null
  );
  const [recipientName, setRecipientName] = useState(
    initialSetting.recipientName || "TEOH CHUN SEONG"
  );

  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse current payload for metadata inspection
  const parsed = parseDuitNowPayload(duitnowPayload);

  // Auto-sync recipient name when valid payload changes
  useEffect(() => {
    if (parsed.isValid && parsed.recipientName) {
      setRecipientName(parsed.recipientName);
    }
  }, [parsed.isValid, parsed.recipientName]);

  // Update dynamic preview QR on changes
  useEffect(() => {
    let active = true;

    async function loadPreview() {
      const parsedAmount =
        type === "FIXED"
          ? Math.round((parseFloat(amountRm) || 10) * 100)
          : Math.round(((100 * (parseInt(percentage, 10) || 20)) / 100) * 100);

      const res = await getPreviewDepositQR({
        basePayload: duitnowPayload || undefined,
        amountCents: parsedAmount,
      });

      if (active && res.success && res.data) {
        setPreviewQrUrl(res.data);
      }
    }

    const timer = setTimeout(loadPreview, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isEnabled, type, amountRm, percentage, duitnowPayload]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQr(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsScanningQr(false);
          setStatusMessage({
            type: "error",
            text: "Canvas context not available.",
          });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          const check = parseDuitNowPayload(code.data);
          if (check.isValid) {
            setDuitnowPayload(code.data);
            if (check.recipientName) setRecipientName(check.recipientName);
            setQrImageUrl(event.target?.result as string);
            setStatusMessage({
              type: "success",
              text: `Successfully extracted DuitNow payload for ${check.recipientName || "Payee"}.`,
            });
            toast.success("QR code decoded successfully!");
          } else {
            setStatusMessage({
              type: "error",
              text: "QR detected, but it does not appear to be a valid EMVCo DuitNow QR code.",
            });
            toast.error("Invalid DuitNow QR detected.");
          }
        } else {
          setQrImageUrl(event.target?.result as string);
          setStatusMessage({
            type: "error",
            text: "Could not decode text/payload from QR image. Image saved as visual fallback.",
          });
          toast.error("Could not decode QR payload. Image stored as fallback.");
        }
        setIsScanningQr(false);
      };

      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleLanguageSelect(newMode: DeskLanguageMode) {
    setDeskLanguage(newMode);
    setLangMode(newMode);
  }

  function handleSave() {
    setStatusMessage(null);
    startTransition(async () => {
      const amountCents = Math.round((parseFloat(amountRm) || 10) * 100);
      const parsedPercentage = parseInt(percentage, 10) || 20;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("app_currency_symbol", currencySymbol);
        } catch {}
      }
      saveDeskLanguage(deskLanguage);

      const res = await updateDepositSetting({
        isEnabled,
        type,
        amountCents,
        percentage: parsedPercentage,
        duitnowPayload,
        qrImageUrl,
        recipientName,
        currency,
        currencySymbol,
        deskLanguage,
      });

      if (res.success) {
        toast.success(
          deskLanguage === "ONLY_ZH"
            ? "设置保存成功！"
            : deskLanguage === "ONLY_EN"
            ? "Settings saved successfully!"
            : "设置保存成功 / Settings saved successfully!"
        );
        setStatusMessage(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save settings.");
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save settings.",
        });
      }
    });
  }

  function handleResetDefault() {
    setDuitnowPayload(DEFAULT_DUITNOW_PAYLOAD);
    setRecipientName("TEOH CHUN SEONG");
    toast.success("Reset to default Touch 'n Go DuitNow QR (Teoh Chun Seong). Click Save to apply.");
    setStatusMessage(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Card */}
      <Card className="lg:col-span-7">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {resolveLabel({ zh: "定金与线上支付设置", en: "Booking Deposit & Payment" }, deskLanguage)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {resolveLabel(
                    {
                      zh: "配置顾客在线预约时需支付的定金金额、收款码与币种",
                      en: "Require customers to pay a deposit with dynamic QR code",
                    },
                    deskLanguage
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled
                ? resolveLabel({ zh: "定金已启用", en: "Deposit Active" }, deskLanguage)
                : resolveLabel({ zh: "线下全额支付", en: "Full Amount" }, deskLanguage)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Country & Currency Selector */}
          <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {resolveLabel({ zh: "国家与结算货币", en: "Country & Currency" }, deskLanguage)}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrency("MYR");
                  setCurrencySymbol("RM");
                }}
                className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                  currency === "MYR"
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-foreground">🇲🇾 Malaysia</p>
                  <p className="text-xs text-muted-foreground">RM (MYR)</p>
                </div>
                {currency === "MYR" && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrency("AUD");
                  setCurrencySymbol("$");
                }}
                className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                  currency === "AUD"
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-foreground">🇦🇺 Australia</p>
                  <p className="text-xs text-muted-foreground">$ (AUD)</p>
                </div>
                {currency === "AUD" && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </button>
            </div>
            {currency === "AUD" && (
              <p className="text-[11px] text-muted-foreground pt-1">
                🇦🇺 Australian Mode: Currency displays as <strong>$</strong>. Customers pay via Cash, Card, or PayID.
              </p>
            )}
          </div>

          {/* Desk Language & Priority Selector */}
          <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {resolveLabel(
                  { zh: "前台语言显示模式与优先级", en: "Desk Language & Priority Mode" },
                  deskLanguage
                )}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              {resolveLabel(
                {
                  zh: "设置沙龙前台收银台 (/admin/desk) 及管理面板的语言显示模式。选定模式将实时全站生效。",
                  en: "Choose language mode for the Salon Desk counter (/admin/desk) and admin panel. Changes take effect across the system.",
                },
                deskLanguage
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {DESK_LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = deskLanguage === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleLanguageSelect(opt.id)}
                    className={`p-3.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{opt.flag}</span>
                        <span className="font-bold text-sm text-foreground">{opt.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                      {opt.description}
                    </p>

                    {/* Live Preview Bar */}
                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                        {resolveLabel({ zh: "预览：", en: "Preview:" }, deskLanguage)}
                      </span>
                      <div className="text-right">
                        <span className="font-black text-foreground">{opt.previewPrimary}</span>
                        {opt.previewSecondary && (
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ({opt.previewSecondary})
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enable / Disable Deposit Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold cursor-pointer" htmlFor="deposit-toggle">
                {resolveLabel({ zh: "启用预约定金收取", en: "Require Booking Deposit" }, deskLanguage)}
              </Label>
              <p className="text-xs text-muted-foreground">
                {resolveLabel(
                  {
                    zh: "开启后，顾客在官网预约时仅需先支付定金锁定名额，到店后再补齐尾款。",
                    en: "When enabled, customers only pay the deposit to hold their slot. Remaining balance is paid at the salon.",
                  },
                  deskLanguage
                )}
              </p>
            </div>
            <button
              type="button"
              id="deposit-toggle"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isEnabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Deposit Mode & Amount (Shown when enabled) */}
          {isEnabled && (
            <div className="space-y-4 p-4 rounded-xl border bg-background animate-in fade-in">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {resolveLabel({ zh: "定金计算模式", en: "Calculation Mode" }, deskLanguage)}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("FIXED")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      type === "FIXED"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    {resolveLabel({ zh: `固定金额 (${currencySymbol})`, en: `Exact Amount (${currencySymbol})` }, deskLanguage)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("PERCENTAGE")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      type === "PERCENTAGE"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Percent className="h-4 w-4" />
                    {resolveLabel({ zh: "比例百分比 (%)", en: "Percentage (%)" }, deskLanguage)}
                  </button>
                </div>
              </div>

              {type === "FIXED" ? (
                <div className="space-y-2">
                  <Label htmlFor="fixedAmount">
                    {resolveLabel({ zh: `定金金额 (${currencySymbol})`, en: `Deposit Amount (${currencySymbol})` }, deskLanguage)}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">
                      {currencySymbol}
                    </span>
                    <Input
                      id="fixedAmount"
                      type="number"
                      step="1"
                      min="1"
                      value={amountRm}
                      onChange={(e) => setAmountRm(e.target.value)}
                      className="pl-11 font-mono font-medium"
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resolveLabel(
                      {
                        zh: `无论服务金额多少，顾客固定预付 ${currencySymbol === "$" ? `$${parseFloat(amountRm || "0").toFixed(2)}` : `RM ${parseFloat(amountRm || "0").toFixed(2)}`} 定金。`,
                        en: `Regardless of service price, customer will pay exactly ${currencySymbol === "$" ? `$${parseFloat(amountRm || "0").toFixed(2)}` : `RM ${parseFloat(amountRm || "0").toFixed(2)}`} deposit.`,
                      },
                      deskLanguage
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="pctAmount">
                    {resolveLabel({ zh: "定金百分比 (%)", en: "Deposit Percentage (%)" }, deskLanguage)}
                  </Label>
                  <div className="relative">
                    <Input
                      id="pctAmount"
                      type="number"
                      step="5"
                      min="5"
                      max="100"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      className="pr-10 font-mono font-medium"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-semibold">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resolveLabel(
                      {
                        zh: `例如 $120 的服务，${percentage}% 定金即为 ${currencySymbol === "$" ? `$${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}` : `RM ${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}`}。`,
                        en: `For example, on a ${currencySymbol === "$" ? "$120.00" : "RM 120.00"} service, a ${percentage}% deposit equals ${currencySymbol === "$" ? `$${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}` : `RM ${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}`}.`,
                      },
                      deskLanguage
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* DuitNow Account Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">
                  {resolveLabel({ zh: "DuitNow 基础收款码配置", en: "DuitNow Base QR Configuration" }, deskLanguage)}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {resolveLabel(
                    {
                      zh: "支持 Touch 'n Go、Maybank MAE、CIMB 或任意马来西亚银行 App 扫码",
                      en: "Works with Touch 'n Go, Maybank MAE, CIMB, or any Malaysian bank QR",
                    },
                    deskLanguage
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                {resolveLabel({ zh: "重置默认", en: "Reset Demo" }, deskLanguage)}
              </Button>
            </div>

            {/* Detected Recipient Badge */}
            <div className="p-3.5 rounded-xl border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {resolveLabel({ zh: "收款方姓名：", en: "Detected Payee:" }, deskLanguage)}
                </span>
                <span className="font-semibold text-foreground">
                  {recipientName || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {resolveLabel({ zh: "EMVCo 规范校验：", en: "EMVCo Standard:" }, deskLanguage)}
                </span>
                <Badge
                  variant={parsed.isValid ? "default" : "destructive"}
                  className="text-[10px] h-5"
                >
                  {parsed.isValid
                    ? resolveLabel({ zh: "有效 DuitNow 码", en: "Valid DuitNow QR" }, deskLanguage)
                    : resolveLabel({ zh: "无效载荷", en: "Invalid Payload" }, deskLanguage)}
                </Badge>
              </div>
            </div>

            {/* Uploaded Exact TNG DuitNow QR Image Display */}
            {qrImageUrl ? (
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">
                      {resolveLabel({ zh: "官方 TNG 收款码图片（顾客扫码视图）", en: "Official TNG DuitNow QR Image" }, deskLanguage)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQrImageUrl(null);
                      setStatusMessage({
                        type: "success",
                        text: "Uploaded QR image removed. Click Save to apply.",
                      });
                    }}
                    className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    {resolveLabel({ zh: "移除图片", en: "Remove Image" }, deskLanguage)}
                  </Button>
                </div>

                <div className="flex justify-center p-2 bg-white rounded-xl border shadow-xs max-w-xs mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="Uploaded Official TNG QR"
                    className="max-h-60 w-auto object-contain rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    ✓ {resolveLabel({ zh: "顾客在在线预约结账时将直接看到此收款图片", en: "This exact downloaded image is displayed to customers at checkout." }, deskLanguage)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningQr}
                    className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    {resolveLabel({ zh: "更换图片", en: "Replace Image" }, deskLanguage)}
                  </Button>
                </div>
              </div>
            ) : (
              /* Upload Client QR Image */
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {resolveLabel({ zh: "上传 TNG / DuitNow 二维码图片", en: "Upload Downloaded TNG / DuitNow QR Image" }, deskLanguage)}
                </Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningQr}
                    className="w-full gap-2 text-xs h-11 rounded-xl font-bold border-2 hover:bg-muted cursor-pointer"
                  >
                    {isScanningQr ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {resolveLabel({ zh: "正在解析图片…", en: "Processing Image…" }, deskLanguage)}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-primary" />
                        {resolveLabel({ zh: "上传 TNG 下载的二维码图片", en: "Upload Downloaded TNG DuitNow QR Image" }, deskLanguage)}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {resolveLabel(
                    {
                      zh: "直接上传您从 Touch 'n Go (TNG) 电子钱包下载的收款码。顾客在线预约支付定金时将直接看到此原图并能扫码。",
                      en: "Upload the QR code image downloaded from your Touch 'n Go (TNG) eWallet app. The exact image will be displayed directly to customers during online booking deposit payment.",
                    },
                    deskLanguage
                  )}
                </p>
              </div>
            )}

            {/* Raw Payload Textarea */}
            <div className="space-y-2">
              <Label htmlFor="duitnowRaw" className="text-xs">
                {resolveLabel({ zh: "EMVCo 原始载荷字符串", en: "Raw EMVCo Payload String" }, deskLanguage)}
              </Label>
              <Textarea
                id="duitnowRaw"
                rows={3}
                value={duitnowPayload}
                onChange={(e) => setDuitnowPayload(e.target.value)}
                placeholder="000201010211..."
                className="font-mono text-[11px] leading-relaxed break-all resize-none"
              />
            </div>
          </div>

          {/* Error feedback message (if any) */}
          {statusMessage && statusMessage.type === "error" && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Save Button */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || isScanningQr}
            className="w-full gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {resolveLabel({ zh: "正在保存设置…", en: "Saving settings…" }, deskLanguage)}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {resolveLabel({ zh: "保存设置", en: "Save Settings" }, deskLanguage)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Live Customer Preview */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="bg-gradient-to-b from-primary/5 via-background to-background border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              {resolveLabel({ zh: "顾客端实时预览", en: "Customer View Preview" }, deskLanguage)}
            </div>
            <CardTitle className="text-base">
              {resolveLabel({ zh: "动态 DuitNow 收款码预览", en: "Dynamic DuitNow QR Preview" }, deskLanguage)}
            </CardTitle>
            <CardDescription className="text-xs">
              {resolveLabel(
                {
                  zh: "此为顾客在线预约时看到的支付界面与收款码",
                  en: "This is how your customer will see and scan the QR during checkout",
                },
                deskLanguage
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            {/* Amount Banner */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground">
                {resolveLabel({ zh: "预填定金金额", en: "Pre-filled Deposit Amount" }, deskLanguage)}
              </p>
              <p className="text-2xl font-black text-primary font-mono tracking-tight mt-0.5">
                {isEnabled
                  ? type === "FIXED"
                    ? (currencySymbol === "$" ? `$${parseFloat(amountRm || "10").toFixed(2)}` : `RM ${parseFloat(amountRm || "10").toFixed(2)}`)
                    : (currencySymbol === "$"
                        ? `$${((100 * (parseFloat(percentage) || 20)) / 100).toFixed(2)}`
                        : `RM ${((100 * (parseFloat(percentage) || 20)) / 100).toFixed(2)}`) + ` (${percentage}%)`
                  : (currencySymbol === "$" ? "$100.00 (Full Amount)" : "RM 100.00 (Full Amount)")}
              </p>
              <p className="text-[11px] text-primary/80 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 inline" />
                {resolveLabel({ zh: "扫码时金额已锁定不可随意篡改", en: "Amount is locked & non-editable on scan" }, deskLanguage)}
              </p>
            </div>

            {/* Rendered Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border mx-auto max-w-[260px]">
              {previewQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewQrUrl}
                  alt="Dynamic DuitNow QR Preview"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                  <QrCode className="h-12 w-12 animate-pulse opacity-40" />
                </div>
              )}
              <div className="mt-2 text-center">
                <p className="text-xs font-bold text-gray-900 tracking-wide">
                  {recipientName}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">DuitNow National QR</p>
              </div>
            </div>

            {/* Instructional helper */}
            <div className="p-3 rounded-xl bg-muted/60 text-left space-y-1 text-xs text-muted-foreground border">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-primary" />
                {resolveLabel({ zh: "顾客支付流程说明：", en: "How customers experience this:" }, deskLanguage)}
              </div>
              <p className="text-[11px] leading-relaxed">
                {resolveLabel(
                  {
                    zh: `顾客使用 Touch 'n Go、MAE 或任何银行 App 扫描此二维码时，App 自动预填好 ${isEnabled ? (type === "FIXED" ? (currencySymbol === "$" ? `$${parseFloat(amountRm || "10").toFixed(2)}` : `RM ${parseFloat(amountRm || "10").toFixed(2)}`) : `${percentage}% 定金`) : "全额"} 及流水参考号，顾客无法漏付或篡改金额。`,
                    en: `When a customer opens Touch 'n Go, MAE, or CIMB and scans this QR, their app immediately opens the transfer screen with ${isEnabled ? (type === "FIXED" ? (currencySymbol === "$" ? `$${parseFloat(amountRm || "10").toFixed(2)}` : `RM ${parseFloat(amountRm || "10").toFixed(2)}`) : `${percentage}% deposit`) : "full amount"} and reference code already entered. They cannot accidentally underpay!`,
                  },
                  deskLanguage
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
