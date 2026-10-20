"use client";

import { useEffect, useState, useTransition } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { confirmBookingReceipt } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice, cn } from "@/lib/utils";
import { format } from "date-fns";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  QrCode,
  AlertCircle,
  Clock,
  MessageCircle,
  RotateCcw,
  Moon,
  Sparkles,
  Maximize2,
  X,
  CheckCircle2,
  Download,
} from "lucide-react";

const PAYMENT_QR_URL = process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? null;
const MERCHANT_WHATSAPP = process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP ?? "";

export function StepPaymentInstructions() {
  const {
    selectedService,
    selectedSlotStart,
    customerDetails,
    pendingHold,
    setConfirmation,
    setSubmitError,
    submitError,
    prevStep,
    goToStep,
    currencySymbol,
  } = useBookingStore();

  const { language, t } = useCustomerLanguage();
  const [isPending, startTransition] = useTransition();
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const operatingHours = getOperatingHoursInfo();

  // 7-minute countdown timer based on holdExpiresAt
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!pendingHold?.holdExpiresAt) return 7 * 60;
    const diff = Math.floor(
      (new Date(pendingHold.holdExpiresAt).getTime() - Date.now()) / 1000
    );
    return Math.max(diff, 0);
  });

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isExpired = secondsRemaining <= 0;

  const isDepositExempt = !!pendingHold?.isDepositExempt;

  function handleConfirmReceipt() {
    if (!pendingHold) return;

    startTransition(async () => {
      setSubmitError(null);
      const result = await confirmBookingReceipt(pendingHold.referenceCode);

      if (result.success) {
        setConfirmation(result.data);
        if (result.data.whatsappUrl) {
          window.open(result.data.whatsappUrl, "_blank");
        }
      } else {
        setSubmitError(result.error);
      }
    });
  }

  // Pre-filled fallback WhatsApp message for reschedule/refund if timer expired but money was sent
  const fallbackHelpUrl = `https://wa.me/${MERCHANT_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi, I made a booking for ${selectedService?.name ?? "appointment"} (${
      selectedSlotStart ? format(new Date(selectedSlotStart), "d MMM yyyy, h:mm a") : ""
    }), Reference: ${pendingHold?.referenceCode ?? "N/A"}. My session timed out. Please assist me.`
  )}`;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          {isDepositExempt ? (
            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          ) : (
            <CreditCard className="h-5 w-5" />
          )}
          <span className="text-sm font-medium uppercase tracking-wider">
            {language === "zh" ? "第 4 步 / 共 4 步" : "Step 4 of 4"}
          </span>
        </div>
        <h2 className="text-2xl font-bold">
          {isDepositExempt
            ? language === "zh"
              ? "确认预约 (熟客免付定金)"
              : "Confirm Booking (Deposit Waived)"
            : t.step4.title[language]}
        </h2>
        <p className="text-muted-foreground">
          {isDepositExempt
            ? language === "zh"
              ? "尊贵熟客无需支付定金，直接确认预约"
              : "As our valued regular customer, no online deposit is required"
            : t.step4.subtitle[language]}
        </p>
      </div>

      {/* Regular Customer VIP Announcement Banner */}
      {isDepositExempt && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-200 space-y-2 text-left shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              🌟
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-900 dark:text-amber-100">
                {t.step4.vipTitle[language]}
              </h3>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                {language === "zh"
                  ? `已识别熟客手机号: ${customerDetails.phoneNumber}`
                  : `Recognized regular customer: ${customerDetails.phoneNumber}`}
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed pt-1">
            {t.step4.vipDesc[language]}
          </p>
        </div>
      )}

      {/* Countdown Timer Banner */}
      <div
        className={cn(
          "p-4 rounded-xl border flex items-center justify-between transition-colors",
          isExpired
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {isExpired
                ? language === "zh"
                  ? "预约已超时"
                  : "Reservation Expired"
                : language === "zh"
                ? "时段已为您临时锁定"
                : "Slot Temporarily Held"}
            </p>
            <p className="text-xs opacity-90">
              {isExpired
                ? language === "zh"
                  ? "该时段已释放给其他顾客。"
                  : "This slot has been released for others."
                : language === "zh"
                ? "请在倒计时结束前完成确认"
                : "Complete confirmation before timer reaches 00:00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xl font-bold tracking-wider">
            {isExpired ? "00:00" : timerDisplay}
          </span>
        </div>
      </div>

      {/* After-Hours Booking Notice */}
      {operatingHours.isOutside && (
        <div className="p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-left dark:bg-indigo-950/30 dark:border-indigo-800">
          <div className="flex items-start gap-2.5">
            <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                {language === "zh" ? "非营业时间预约提醒" : "After-Hours Booking Notice"}
              </p>
              <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
                {language === "zh" ? (
                  <>
                    当前为沙龙非营业时间 ({operatingHours.displayDays}, {operatingHours.displayHours})。
                    <br />
                    <strong>您仍可正常提交预约！</strong> 点击确认后，您的时段将{" "}
                    <strong>永久锁定</strong>，不会被他人抢订。我们将在{" "}
                    {operatingHours.nextOpenDayNotice} 优先确认您的预约。
                  </>
                ) : (
                  <>
                    We are currently outside our operating hours ({operatingHours.displayDays},{" "}
                    {operatingHours.displayHours}).
                    <br />
                    <strong>You can still proceed!</strong> Once confirmed, your slot is{" "}
                    <strong>securely locked</strong>. Our team will verify and confirm your booking{" "}
                    {operatingHours.nextOpenDayNotice}.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Summary */}
      {selectedService && selectedSlotStart && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-primary">
                {language === "zh" ? "已锁定时段概览" : "Your Held Reservation"}
              </h4>
              {pendingHold && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {pendingHold.referenceCode}
                </span>
              )}
            </div>
            <Separator className="bg-primary/20" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.fullName[language]}</span>
                <span className="font-medium">{customerDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.service[language]}</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step3.datetime[language]}</span>
                <span className="font-medium text-right">
                  {format(new Date(selectedSlotStart), "d MMM yyyy, h:mm a")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.step4.totalService[language]}</span>
                <span className="font-medium tabular-nums">
                  {formatPrice(selectedService.priceCents, currencySymbol)}
                </span>
              </div>

              {isDepositExempt ? (
                <>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      🌟 {t.step4.depositDue[language]}
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {language === "zh" ? "免付 (熟客专属)" : "Waived (VIP Regular)"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.step4.balanceDue[language]}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatPrice(selectedService.priceCents, currencySymbol)}
                    </span>
                  </div>
                </>
              ) : pendingHold?.depositDueCents != null &&
                pendingHold.depositDueCents > 0 &&
                pendingHold.depositDueCents < selectedService.priceCents ? (
                <>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {t.step4.depositDue[language]}
                      <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
                        {language === "zh" ? "需付定金" : "Deposit"}
                      </span>
                    </span>
                    <span className="font-bold text-primary text-base tabular-nums">
                      {formatPrice(pendingHold.depositDueCents, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.step4.balanceDue[language]}</span>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(
                        pendingHold.balanceDueCents ??
                          selectedService.priceCents - pendingHold.depositDueCents,
                        currencySymbol
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between font-bold text-base">
                    <span>{t.step4.totalAmount[language]}</span>
                    <span className="text-primary tabular-nums">
                      {formatPrice(selectedService.priceCents, currencySymbol)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment / Exemption Section */}
      {!isDepositExempt ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">
                  {language === "zh" ? "支付步骤指引" : "How to Pay"}
                </h3>
              </div>
              {pendingHold?.recipientName && (
                <span className="text-xs text-muted-foreground font-medium">
                  {language === "zh" ? "收款商户: " : "Payee: "}
                  <strong className="text-foreground">{pendingHold.recipientName}</strong>
                </span>
              )}
            </div>

            <ol className="space-y-3 text-sm text-muted-foreground list-none">
              {[
                t.step4.instruction1[language],
                pendingHold?.depositDueCents != null &&
                pendingHold.depositDueCents > 0 &&
                pendingHold.depositDueCents < (selectedService?.priceCents ?? 0)
                  ? t.step4.instruction2Deposit(
                      formatPrice(pendingHold.depositDueCents, currencySymbol)
                    )[language]
                  : t.step4.instruction2Full(
                      selectedService
                        ? formatPrice(selectedService.priceCents, currencySymbol)
                        : ""
                    )[language],
                t.step4.instruction3[language],
                t.step4.instruction4[language],
              ].map((stepText, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{stepText}</span>
                </li>
              ))}
            </ol>

            {/* QR Code Display: Exact Uploaded TNG QR has priority */}
            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              {pendingHold?.qrImageUrl ? (
                // 1. EXACT UPLOADED TNG QR FROM SALON OWNER
                <div className="flex flex-col items-center group">
                  <div
                    onClick={() => setIsQrZoomed(true)}
                    className="relative cursor-pointer p-2.5 bg-white rounded-2xl border-2 border-primary/20 shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-[0.99]"
                    title="Click to enlarge"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingHold.qrImageUrl}
                      alt="Touch 'n Go DuitNow QR"
                      className="max-w-[260px] max-h-[340px] w-auto h-auto rounded-xl object-contain"
                    />
                    <div className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white p-1.5 rounded-lg shadow-md backdrop-blur-xs flex items-center gap-1 text-[11px] font-medium transition-all">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-col items-center gap-1 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      <QrCode className="h-3 w-3" />
                      {t.step4.officialQrBadge[language]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsQrZoomed(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 underline underline-offset-2"
                    >
                      <Maximize2 className="h-3 w-3" />
                      {t.step4.tapToZoom[language]}
                    </button>
                  </div>
                </div>
              ) : pendingHold?.paymentQrDataUrl ? (
                // 2. Dynamic DuitNow National QR generated with pre-filled amount
                <div className="p-3 bg-white rounded-2xl border shadow-sm flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingHold.paymentQrDataUrl}
                    alt="Dynamic DuitNow QR Code"
                    className="w-56 h-56 rounded-lg object-contain"
                  />
                  <div className="mt-2 text-center">
                    <span className="inline-block text-[11px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                      {t.step4.dynamicQrBadge[language]}
                    </span>
                  </div>
                </div>
              ) : PAYMENT_QR_URL ? (
                // 3. Fallback Env QR
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={PAYMENT_QR_URL}
                  alt="DuitNow / TnG QR Code"
                  className="w-48 h-48 rounded-xl border object-contain shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <QrCode className="h-12 w-12 opacity-30" />
                  <p className="text-xs text-center px-2">
                    {language === "zh"
                      ? "管理员暂未配置收款二维码"
                      : "DuitNow QR not yet configured in Admin Settings."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Regular Customer VIP Guidance Card */
        <Card className="border-2 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              {language === "zh" ? "免收定金 · 一键确认" : "Deposit Waived · 1-Click Confirmation"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {language === "zh"
                ? "您无需扫码或转账，点击下方绿色按钮即可立刻锁定此预约时段。全额可在到店享受服务后再付款。"
                : "No payment is required right now. Simply click the button below to secure your appointment. You can settle the full amount after your salon service."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expired Warning or Error */}
      {(isExpired || submitError) && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>
                {submitError ||
                  (language === "zh"
                    ? "您的 7 分钟预约临时保留已超时。"
                    : "Your 7-minute reservation hold has expired.")}
              </p>
            </div>
          </div>

          {/* Fallback Help Button */}
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2 border text-left">
            <p className="text-muted-foreground">
              <strong>{language === "zh" ? "已经转账付款？" : "Already transferred money?"}</strong>{" "}
              {language === "zh"
                ? "请放心！点击下方按钮直接在 WhatsApp 将收据发送给沙龙客服，我们将优先为您保留时段或协助退款："
                : "Don't worry! Click below to send your receipt directly to our team via WhatsApp for priority rescheduling or refund:"}
            </p>
            <a
              href={fallbackHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {language === "zh" ? "WhatsApp 联系沙龙客服协助" : "WhatsApp Merchant for Help / Refund"}
            </a>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {isExpired ? (
          <Button
            variant="outline"
            onClick={() => goToStep(2)}
            className="w-full gap-2 font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            {language === "zh" ? "重新选择预约时段" : "Pick Another Time Slot"}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isPending}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.step2.back[language]}
            </Button>

            {isDepositExempt ? (
              <Button
                onClick={handleConfirmReceipt}
                disabled={isPending || isExpired}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 gap-2 shadow-md"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.step4.submitting[language]}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t.step4.vipConfirmBtn[language]}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConfirmReceipt}
                disabled={isPending || isExpired}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 gap-2 shadow-md"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.step4.submitting[language]}
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    {t.step4.ivePaidBtn[language]}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Full-Screen QR Zoom Modal */}
      {isQrZoomed && pendingHold?.qrImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsQrZoomed(false)}
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-1 border-b">
              <span className="text-xs font-bold text-gray-800">
                {t.step4.officialQrBadge[language]}
              </span>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingHold.qrImageUrl}
              alt="Enlarged DuitNow QR"
              className="max-h-[70vh] w-auto object-contain rounded-xl shadow-xs"
            />

            <div className="w-full space-y-2">
              <p className="text-xs text-gray-500">
                {language === "zh"
                  ? "支持长按保存图片或使用另一台手机/App直接扫码"
                  : "Long-press to save image, or scan using your banking app"}
              </p>
              <div className="flex gap-2">
                <a
                  href={pendingHold.qrImageUrl}
                  download="TouchNGo-DuitNow-QR.png"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {language === "zh" ? "下载保存二维码" : "Save / Download QR"}
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQrZoomed(false)}
                  className="py-2.5 px-4 text-xs font-bold"
                >
                  {language === "zh" ? "关闭" : "Close"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
