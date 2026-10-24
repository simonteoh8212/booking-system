"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { formatPrice } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  MessageCircle,
  CalendarCheck,
  Copy,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
import { useCustomerLanguage } from "./CustomerLanguageContext";

export function BookingConfirmation() {
  const { confirmation, reset, currencySymbol } = useBookingStore();
  const { language, t } = useCustomerLanguage();
  const [copied, setCopied] = useState(false);
  const operatingHours = getOperatingHoursInfo();

  if (!confirmation) return null;

  function copyRef() {
    navigator.clipboard.writeText(confirmation!.referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isDepositExempt = !!confirmation.isDepositExempt;

  // Dynamically build WhatsApp URL based on the user's active language
  const dynamicWhatsappUrl = buildWhatsAppUrl({
    referenceCode: confirmation.referenceCode,
    serviceName: confirmation.serviceName,
    startDatetime: new Date(confirmation.startDatetime),
    customerName: confirmation.customerName,
    totalPriceCents: confirmation.totalPriceCents,
    depositDueCents: confirmation.depositDueCents,
    balanceDueCents: confirmation.balanceDueCents,
    isDepositExempt,
    currencySymbol,
    language,
  });

  return (
    <div className="space-y-6 text-center">
      {/* Success Hero */}
      <div className="space-y-3">
        <div className="flex justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isDepositExempt ? "bg-amber-100" : "bg-green-100"
            }`}
          >
            {isDepositExempt ? (
              <Sparkles className="h-10 w-10 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            )}
          </div>
        </div>
        <div>
          <h2
            className={`text-2xl font-bold ${
              isDepositExempt ? "text-amber-800 dark:text-amber-300" : "text-green-700 dark:text-green-400"
            }`}
          >
            {isDepositExempt
              ? language === "zh"
                ? "熟客预约已锁定！"
                : "Appointment Confirmed!"
              : t.confirmation.title[language]}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isDepositExempt
              ? language === "zh"
                ? "🌟 感谢您的支持，本次预约已免除定金，到店直接享受服务！"
                : "🌟 As our valued regular customer, deposit is waived. See you at the salon!"
              : t.confirmation.subtitle[language]}
          </p>
        </div>
      </div>

      {/* Reference Code Box */}
      <div className="flex items-center justify-center gap-2">
        <div className="bg-muted rounded-xl px-5 py-2.5 font-mono text-xl font-bold tracking-widest text-foreground shadow-xs">
          {confirmation.referenceCode}
        </div>
        <button
          onClick={copyRef}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          title="Copy reference code"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {copied && (
        <p className="text-xs text-green-600 font-semibold -mt-3">
          {language === "zh" ? "已复制到剪贴板！" : "Copied to clipboard!"}
        </p>
      )}

      {/* Appointment Details Card */}
      <Card>
        <CardContent className="p-5 text-left space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              {language === "zh" ? "预约信息明细" : "Appointment Details"}
            </h3>
          </div>
          <Separator />
          <div className="space-y-2 text-sm pt-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.confirmation.customer[language]}</span>
              <span className="font-medium text-right">{confirmation.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.confirmation.service[language]}</span>
              <span className="font-medium text-right">{confirmation.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.confirmation.dateTime[language]}</span>
              <span className="font-medium text-right">
                {language === "zh"
                  ? format(new Date(confirmation.startDatetime), "yyyy年M月d日 (EEEE) h:mm a")
                  : format(new Date(confirmation.startDatetime), "EEEE, d MMMM yyyy, h:mm a")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.confirmation.total[language]}</span>
              <span className="font-medium text-right tabular-nums">
                {formatPrice(confirmation.totalPriceCents, currencySymbol)}
              </span>
            </div>

            {isDepositExempt ? (
              <>
                <div className="flex justify-between">
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    🌟 {t.confirmation.depositWaived[language]}
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 text-right">
                    {language === "zh" ? "已免收 (RM 0.00)" : "Waived ($0.00)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.confirmation.balanceDue[language]}</span>
                  <span className="font-semibold text-right tabular-nums text-foreground">
                    {formatPrice(confirmation.totalPriceCents, currencySymbol)}
                  </span>
                </div>
              </>
            ) : confirmation.depositDueCents != null &&
              confirmation.depositDueCents > 0 &&
              confirmation.depositDueCents < confirmation.totalPriceCents ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.confirmation.depositPaid[language]}</span>
                  <span className="font-semibold text-green-600 text-right tabular-nums">
                    {formatPrice(confirmation.depositDueCents, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.confirmation.balanceDue[language]}</span>
                  <span className="font-semibold text-right tabular-nums">
                    {formatPrice(
                      confirmation.balanceDueCents ??
                        confirmation.totalPriceCents - confirmation.depositDueCents,
                      currencySymbol
                    )}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation & Operating Hours Notice */}
      {operatingHours.isOutside ? (
        <Card className="bg-indigo-50/80 border-indigo-200 text-left dark:bg-indigo-950/20 dark:border-indigo-800">
          <CardContent className="p-4 space-y-1.5">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-1.5">
              🌙 {language === "zh" ? "时段已锁定！非营业时间通知" : "Slot Locked & Reserved!"}
            </h4>
            <p className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed">
              {language === "zh" ? (
                <>
                  您在非营业时间提交了预约 ({operatingHours.displayDays}, {operatingHours.displayHours})。
                  <strong>您的预约时段已被系统安全锁定</strong>，沙龙团队将在{" "}
                  {operatingHours.nextOpenDayNotice} 优先核对并为您确认。
                </>
              ) : (
                <>
                  You submitted your booking outside operating hours ({operatingHours.displayDays},{" "}
                  {operatingHours.displayHours}). <strong>Your slot is securely locked</strong> and
                  will be reviewed and confirmed {operatingHours.nextOpenDayNotice} once our team
                  verifies your submission.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={
            isDepositExempt
              ? "bg-amber-50 border-amber-200 text-left dark:bg-amber-950/20 dark:border-amber-800"
              : "bg-green-50 border-green-200 text-left dark:bg-green-950/20 dark:border-green-800"
          }
        >
          <CardContent className="p-4 space-y-1.5">
            <h4
              className={
                isDepositExempt
                  ? "font-semibold text-amber-900 dark:text-amber-300 text-sm"
                  : "font-semibold text-green-900 dark:text-green-300 text-sm"
              }
            >
              {isDepositExempt
                ? language === "zh"
                  ? "🌟 熟客特权名额已锁定！"
                  : "🌟 VIP Appointment Secured!"
                : language === "zh"
                ? "✅ 预约名额已成功锁定！"
                : "✅ Slot Successfully Reserved!"}
            </h4>
            <p
              className={
                isDepositExempt
                  ? "text-amber-800 dark:text-amber-200 text-sm leading-relaxed"
                  : "text-green-800 dark:text-green-200 text-sm leading-relaxed"
              }
            >
              {isDepositExempt
                ? language === "zh"
                  ? "由于您是我们的常客，无需审核定金。您可以点击下方按钮直接打开 WhatsApp 向沙龙发送预约提醒。"
                  : "As a trusted regular, your booking is pre-approved! Click below to send a quick WhatsApp note to our team."
                : language === "zh"
                ? "请在打开的 WhatsApp 聊天窗口中附上转账收据截图。沙龙团队核实后将尽快完成最终确认。"
                : "Please attach your payment receipt screenshot in the WhatsApp chat. Our team will verify and confirm your appointment shortly."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp CTA */}
      <a
        href={dynamicWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button
          size="lg"
          className="w-full h-14 text-base bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold gap-2 shadow-lg cursor-pointer"
        >
          <MessageCircle className="h-5 w-5" />
          {isDepositExempt
            ? language === "zh"
              ? "打开 WhatsApp 发送预约通知"
              : "Open WhatsApp to Notify Salon"
            : t.confirmation.openWhatsApp[language]}
        </Button>
      </a>

      {/* Self-check status link */}
      <div className="pt-1">
        <Link
          href={`/check-booking?ref=${confirmation.referenceCode}`}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
        >
          <Search className="h-3.5 w-3.5" />
          {language === "zh"
            ? "随时在线追踪您的预约状态"
            : "Track your booking status online anytime"}
        </Link>
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {t.confirmation.newBooking[language]}
      </button>
    </div>
  );
}
