"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { DESK_LANGUAGE_OPTIONS } from "@/lib/desk-i18n";
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
  const [currency, setCurrency] = useState<string>(initialSetting.currency || "MYR");
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialSetting.currencySymbol || "RM");
  const [deskLanguage, setDeskLanguage] = useState<DeskLanguageMode>(
    initialSetting.deskLanguage || "BILINGUAL_ZH_FIRST"
  );
  const [isEnabled, setIsEnabled] = useState(initialSetting.isEnabled);
  const [type, setType] = useState<"FIXED" | "PERCENTAGE">(initialSetting.type);
  const [amountRm, setAmountRm] = useState((initialSetting.amountCents / 100).toFixed(2));
  const [percentage, setPercentage] = useState(String(initialSetting.percentage || 20));
  const [duitnowPayload, setDuitnowPayload] = useState(
    initialSetting.duitnowPayload || DEFAULT_DUITNOW_PAYLOAD
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
    async function updatePreview() {
      const cents =
        type === "PERCENTAGE"
          ? Math.round((10000 * (parseFloat(percentage) || 20)) / 100) // Sample RM100 service
          : Math.round(parseFloat(amountRm || "10") * 100);

      const res = await getPreviewDepositQR({
        basePayload: duitnowPayload,
        amountCents: Math.max(100, cents),
      });

      if (active && res.success) {
        setPreviewQrUrl(res.data);
      }
    }
    updatePreview();
    return () => {
      active = false;
    };
  }, [duitnowPayload, amountRm, percentage, type]);

  // Handle uploading and decoding client's DuitNow QR screenshot
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQr(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Canvas context not available");
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const raw = code.data.trim();
            const check = parseDuitNowPayload(raw);
            if (check.isValid) {
              setDuitnowPayload(raw);
              setRecipientName(check.recipientName);
              setStatusMessage({
                type: "success",
                text: `QR code successfully scanned! Recipient detected: ${check.recipientName}`,
              });
            } else {
              setDuitnowPayload(raw);
              setStatusMessage({
                type: "success",
                text: "QR code data extracted. Please verify the recipient details.",
              });
            }
          } else {
            setStatusMessage({
              type: "error",
              text: "Could not detect a valid DuitNow QR in that image. Try a clearer screenshot or paste the string directly.",
            });
          }
        } catch (err) {
          console.error(err);
          setStatusMessage({
            type: "error",
            text: "Failed to process image. Please upload a PNG or JPEG file.",
          });
        } finally {
          setIsScanningQr(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setStatusMessage(null);
    startTransition(async () => {
      const amountCents = Math.round((parseFloat(amountRm) || 10) * 100);
      const parsedPercentage = parseInt(percentage, 10) || 20;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("app_currency_symbol", currencySymbol);
          localStorage.setItem("app_desk_language", deskLanguage);
        } catch {}
      }

      const res = await updateDepositSetting({
        isEnabled,
        type,
        amountCents,
        percentage: parsedPercentage,
        duitnowPayload,
        recipientName,
        currency,
        currencySymbol,
        deskLanguage,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Settings saved successfully! Currency: ${currencySymbol} (${currency}), Desk Language: ${deskLanguage}.`,
        });
        router.refresh();
      } else {
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
    setStatusMessage({
      type: "success",
      text: "Reset to default Touch 'n Go DuitNow QR (Teoh Chun Seong). Click Save to apply.",
    });
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
                <CardTitle className="text-lg">Booking Deposit & DuitNow QR</CardTitle>
                <CardDescription className="text-xs">
                  Require customers to pay a deposit with dynamic QR code
                </CardDescription>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Deposit Active" : "Full Amount"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Country & Currency Selector */}
          <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Country & Currency / 国家与货币
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
                Desk Language & Priority / 柜台语言显示模式与优先级
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Choose language mode for the Salon Desk counter (/admin/desk). Selected language will be highlighted and prominent.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {DESK_LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = deskLanguage === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeskLanguage(opt.id)}
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
                        Preview:
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
                Require Booking Deposit
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, customers only pay the deposit to hold their slot. Remaining balance is paid at the salon.
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
                  Calculation Mode
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
                    Exact Amount ({currencySymbol})
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
                    Percentage (%)
                  </button>
                </div>
              </div>

              {type === "FIXED" ? (
                <div className="space-y-2">
                  <Label htmlFor="fixedAmount">Deposit Amount ({currencySymbol})</Label>
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
                    Regardless of service price, customer will pay exactly{" "}
                    <strong>{currencySymbol === "$" ? `$${parseFloat(amountRm || "0").toFixed(2)}` : `RM ${parseFloat(amountRm || "0").toFixed(2)}`}</strong> deposit.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="percentageVal">Deposit Percentage (%)</Label>
                  <div className="relative">
                    <Input
                      id="percentageVal"
                      type="number"
                      step="1"
                      min="1"
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
                    For example, on a {currencySymbol === "$" ? "$120.00" : "RM 120.00"} service, a {percentage}% deposit equals{" "}
                    <strong>{currencySymbol === "$" ? `$${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}` : `RM ${((120 * (parseFloat(percentage) || 0)) / 100).toFixed(2)}`}</strong>.
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
                <Label className="text-sm font-semibold">DuitNow Base QR Configuration</Label>
                <p className="text-xs text-muted-foreground">
                  Works with Touch &apos;n Go, Maybank MAE, CIMB, or any Malaysian bank QR
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
                Reset Demo
              </Button>
            </div>

            {/* Detected Recipient Badge */}
            <div className="p-3.5 rounded-xl border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Detected Payee:</span>
                <span className="font-semibold text-foreground">
                  {recipientName || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">EMVCo Standard:</span>
                <Badge
                  variant={parsed.isValid ? "default" : "destructive"}
                  className="text-[10px] h-5"
                >
                  {parsed.isValid ? "Valid DuitNow QR" : "Invalid Payload"}
                </Badge>
              </div>
            </div>

            {/* Upload Client QR Image */}
            <div className="space-y-2">
              <Label className="text-xs">Quick Setup: Upload QR Code Image</Label>
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
                  className="w-full gap-2 text-xs"
                >
                  {isScanningQr ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Scanning QR Image…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload Client&apos;s DuitNow QR Screenshot
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload your client&apos;s personal or merchant DuitNow QR screenshot to automatically extract their account details.
              </p>
            </div>

            {/* Raw Payload Textarea */}
            <div className="space-y-2">
              <Label htmlFor="duitnowRaw" className="text-xs">
                Raw EMVCo Payload String
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

          {/* Feedback message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
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
                正在保存设置… (Saving…)
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                保存设置 / Save Settings
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
              Customer View Preview
            </div>
            <CardTitle className="text-base">Dynamic DuitNow QR Preview</CardTitle>
            <CardDescription className="text-xs">
              This is how your customer will see and scan the QR during checkout
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            {/* Amount Banner */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground">Pre-filled Deposit Amount</p>
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
                <CheckCircle2 className="h-3 w-3 inline" /> Amount is locked & non-editable on scan
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
                How customers experience this:
              </div>
              <p className="text-[11px] leading-relaxed">
                When a customer opens Touch &apos;n Go, MAE, or CIMB and scans this QR, their app immediately opens the transfer screen with{" "}
                <strong className="text-foreground">
                  {isEnabled
                    ? type === "FIXED"
                      ? (currencySymbol === "$" ? `$${parseFloat(amountRm || "10").toFixed(2)}` : `RM ${parseFloat(amountRm || "10").toFixed(2)}`)
                      : `${percentage}% deposit`
                    : "full amount"}
                </strong>{" "}
                and reference code already entered. They cannot accidentally underpay!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
