"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  buildCustomerReceiptWhatsAppUrl,
  formatCustomerReceiptText,
  type CustomerReceiptData,
} from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import { resolveServiceName } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Receipt,
  Printer,
  Copy,
  Check,
  MessageCircle,
  Phone,
} from "lucide-react";

interface CustomerReceiptDialogProps {
  receipt: CustomerReceiptData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string;
  currencySymbol?: string;
  languageMode?: DeskLanguageMode;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function CustomerReceiptDialog({
  receipt,
  open,
  onOpenChange,
  businessName = "Salon Desk",
  currencySymbol = "RM",
  languageMode = "ONLY_EN",
}: CustomerReceiptDialogProps) {
  const isZh = languageMode === "ONLY_ZH";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const initialPhone =
    receipt?.customerPhone && !receipt.customerPhone.startsWith("WALKIN-")
      ? receipt.customerPhone
      : "";

  const [phoneDraftKey, setPhoneDraftKey] = useState<string>("");
  const [phoneDraftValue, setPhoneDraftValue] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const receiptKey = `${receipt.referenceCode}-${receipt.timestampIso}`;
  const phoneInput =
    phoneDraftKey === receiptKey ? phoneDraftValue : initialPhone;

  const setPhoneInput = (val: string) => {
    setPhoneDraftKey(receiptKey);
    setPhoneDraftValue(val);
  };

  const dt = new Date(receipt.timestampIso);
  const formattedDateTime = Number.isNaN(dt.getTime())
    ? receipt.timestampIso
    : new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(dt);

  const paymentMethodLabel =
    receipt.paymentMethod === "CASH"
      ? t("Cash", "现金")
      : receipt.paymentMethod === "DUITNOW_QR"
      ? "DuitNow QR"
      : receipt.paymentMethod === "CARD"
      ? t("Card", "刷卡")
      : t("Credit / Promo", "储值 / 配套");

  const hasDeductions =
    (receipt.promoDiscountCents ?? 0) > 0 ||
    (receipt.depositPaidCents ?? 0) > 0 ||
    (receipt.creditUsedCents ?? 0) > 0;

  const hasBalances =
    receipt.remainingCreditCents != null ||
    Boolean(receipt.promoSummaries && receipt.promoSummaries.length > 0);

  const localizedReceipt: CustomerReceiptData = {
    ...receipt,
    items: receipt.items.map((it) => ({
      ...it,
      name: resolveServiceName(it.name, languageMode).primary,
    })),
  };

  async function handleCopyReceipt() {
    try {
      const text = formatCustomerReceiptText(localizedReceipt, {
        language: isZh ? "zh" : "en",
        businessName,
        currencySymbol,
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("Receipt copied to clipboard.", "收据内容已复制。"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Failed to copy receipt.", "复制失败。"));
    }
  }

  function handlePrintReceipt() {
    if (typeof document === "undefined") return;

    const itemRowsHtml = localizedReceipt.items
      .map((item) => {
        const priceStr = formatPrice(
          item.promoLabel ? 0 : item.paidPriceCents,
          currencySymbol
        );
        const promoSub = item.promoLabel
          ? `<div class="sub">${escapeHtml(
              t("Promo", "配套")
            )}: ${escapeHtml(item.promoLabel)} (${escapeHtml(
              formatPrice(item.originalPriceCents, currencySymbol)
            )})</div>`
          : "";
        return `
          <tr>
            <td class="item-name">
              <div>${escapeHtml(item.name)}</div>
              ${promoSub}
            </td>
            <td class="item-price">${escapeHtml(priceStr)}</td>
          </tr>
        `;
      })
      .join("");

    const deductionsHtml: string[] = [];
    if (hasDeductions) {
      deductionsHtml.push(`
        <div class="row">
          <span>${escapeHtml(t("Subtotal", "消费小计"))}</span>
          <span>${escapeHtml(
            formatPrice(localizedReceipt.subtotalCents, currencySymbol)
          )}</span>
        </div>
      `);
      if ((localizedReceipt.promoDiscountCents ?? 0) > 0) {
        deductionsHtml.push(`
          <div class="row">
            <span>${escapeHtml(t("Promo Redeemed", "配套抵扣"))}</span>
            <span>-${escapeHtml(
              formatPrice(localizedReceipt.promoDiscountCents ?? 0, currencySymbol)
            )}</span>
          </div>
        `);
      }
      if ((localizedReceipt.depositPaidCents ?? 0) > 0) {
        deductionsHtml.push(`
          <div class="row">
            <span>${escapeHtml(t("Deposit Paid", "已付定金"))}</span>
            <span>-${escapeHtml(
              formatPrice(localizedReceipt.depositPaidCents ?? 0, currencySymbol)
            )}</span>
          </div>
        `);
      }
      if ((localizedReceipt.creditUsedCents ?? 0) > 0) {
        deductionsHtml.push(`
          <div class="row">
            <span>${escapeHtml(t("Member Credit", "储值扣款"))}</span>
            <span>-${escapeHtml(
              formatPrice(localizedReceipt.creditUsedCents ?? 0, currencySymbol)
            )}</span>
          </div>
        `);
      }
    }

    const balancesHtml: string[] = [];
    if (localizedReceipt.remainingCreditCents != null) {
      balancesHtml.push(`
        <div class="row">
          <span>${escapeHtml(t("Remaining Credit", "剩余储值余额"))}</span>
          <span>${escapeHtml(
            formatPrice(localizedReceipt.remainingCreditCents, currencySymbol)
          )}</span>
        </div>
      `);
    }
    if (
      localizedReceipt.promoSummaries &&
      localizedReceipt.promoSummaries.length > 0
    ) {
      balancesHtml.push(`
        <div class="row">
          <span>${escapeHtml(t("Promo Balance", "配套余次"))}</span>
          <span>${escapeHtml(localizedReceipt.promoSummaries.join(" · "))}</span>
        </div>
      `);
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(businessName)} - ${escapeHtml(
      localizedReceipt.referenceCode
    )}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 8px;
      width: 100%;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
      font-size: 12px;
      line-height: 1.45;
    }
    .center { text-align: center; }
    .shop-title { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #555; margin-bottom: 8px; }
    .divider { border-top: 1px dashed #888; margin: 8px 0; }
    .meta-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 0; vertical-align: top; }
    .item-name { font-weight: 600; padding-right: 8px; }
    .item-price { text-align: right; font-family: ui-monospace, monospace; white-space: nowrap; font-weight: 600; }
    .sub { font-size: 10px; font-weight: 400; color: #444; margin-top: 1px; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; font-size: 11px; }
    .total-row { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; font-weight: 700; margin: 6px 0 2px; }
    .footer { text-align: center; font-size: 11px; color: #444; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="shop-title">${escapeHtml(businessName)}</div>
    <div class="subtitle">${escapeHtml(
      t("OFFICIAL RECEIPT", "消费收据")
    )}</div>
  </div>
  <div class="divider"></div>
  <div class="meta-row">
    <span>${escapeHtml(t("Ref", "单号"))}:</span>
    <span style="font-family: ui-monospace, monospace; font-weight: 600;">${escapeHtml(
      localizedReceipt.referenceCode
    )}</span>
  </div>
  <div class="meta-row">
    <span>${escapeHtml(t("Date", "日期"))}:</span>
    <span>${escapeHtml(formattedDateTime)}</span>
  </div>
  <div class="meta-row">
    <span>${escapeHtml(t("Customer", "顾客"))}:</span>
    <span>${escapeHtml(localizedReceipt.customerName)}</span>
  </div>
  ${
    phoneInput.trim()
      ? `<div class="meta-row"><span>${escapeHtml(
          t("Phone", "电话")
        )}:</span><span>${escapeHtml(phoneInput.trim())}</span></div>`
      : ""
  }
  <div class="divider"></div>
  <table>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>
  <div class="divider"></div>
  ${deductionsHtml.join("")}
  <div class="total-row">
    <span>${escapeHtml(t("TOTAL PAID", "实付金额"))} (${escapeHtml(
      paymentMethodLabel
    )})</span>
    <span style="font-family: ui-monospace, monospace;">${escapeHtml(
      formatPrice(localizedReceipt.totalPaidCents, currencySymbol)
    )}</span>
  </div>
  ${
    balancesHtml.length > 0
      ? `<div class="divider"></div>${balancesHtml.join("")}`
      : ""
  }
  <div class="divider"></div>
  <div class="footer">${escapeHtml(
    t("Thank you for visiting!", "感谢您的光临，期待再次为您服务！")
  )}</div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 150);
  }

  const whatsappUrl = buildCustomerReceiptWhatsAppUrl(localizedReceipt, {
    phoneOverride: phoneInput,
    language: isZh ? "zh" : "en",
    businessName,
    currencySymbol,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <Receipt className="h-5 w-5 text-primary shrink-0" />
            <span>{t("Customer Receipt", "顾客消费收据")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t(
              "Print on thermal/A4 printer, copy text, or send via WhatsApp.",
              "支持热敏/A4打印、复制文本或通过 WhatsApp 发送给顾客。"
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Thermal Ticket Preview */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 text-xs">
            <div className="text-center space-y-0.5 pb-2.5 border-b border-dashed border-border">
              <div className="text-sm font-bold text-foreground">
                {businessName}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Official Receipt", "消费收据")}
              </div>
            </div>

            <div className="space-y-1 text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>{t("Ref", "单号")}</span>
                <span className="font-mono font-semibold text-foreground">
                  {localizedReceipt.referenceCode}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>{t("Date", "时间")}</span>
                <span className="tabular-nums text-foreground">
                  {formattedDateTime}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>{t("Customer", "顾客")}</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {localizedReceipt.customerName}
                </span>
              </div>
            </div>

            {/* Itemized Services / Products */}
            <div className="py-2.5 border-y border-dashed border-border space-y-2">
              {localizedReceipt.items.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">
                      {item.name}
                    </div>
                    {item.promoLabel && (
                      <div className="text-[11px] text-primary font-medium">
                        {t("Promo", "配套抵扣")}: {item.promoLabel} (
                        <span className="line-through text-muted-foreground">
                          {formatPrice(item.originalPriceCents, currencySymbol)}
                        </span>
                        )
                      </div>
                    )}
                  </div>
                  <div className="font-mono font-semibold text-foreground tabular-nums shrink-0">
                    {formatPrice(
                      item.promoLabel ? 0 : item.paidPriceCents,
                      currencySymbol
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal & Deductions */}
            {hasDeductions && (
              <div className="space-y-1 text-muted-foreground pb-2 border-b border-dashed border-border">
                <div className="flex items-center justify-between gap-2">
                  <span>{t("Subtotal", "消费小计")}</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatPrice(localizedReceipt.subtotalCents, currencySymbol)}
                  </span>
                </div>
                {(localizedReceipt.promoDiscountCents ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-2 text-primary">
                    <span>{t("Promo Redeemed", "配套抵扣")}</span>
                    <span className="font-mono tabular-nums">
                      -
                      {formatPrice(
                        localizedReceipt.promoDiscountCents ?? 0,
                        currencySymbol
                      )}
                    </span>
                  </div>
                )}
                {(localizedReceipt.depositPaidCents ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span>{t("Deposit Paid", "已付定金")}</span>
                    <span className="font-mono tabular-nums">
                      -
                      {formatPrice(
                        localizedReceipt.depositPaidCents ?? 0,
                        currencySymbol
                      )}
                    </span>
                  </div>
                )}
                {(localizedReceipt.creditUsedCents ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-2 text-emerald-600 dark:text-emerald-400">
                    <span>{t("Member Credit Used", "储值扣款")}</span>
                    <span className="font-mono tabular-nums">
                      -
                      {formatPrice(
                        localizedReceipt.creditUsedCents ?? 0,
                        currencySymbol
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total Paid */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div>
                <div className="text-sm font-bold text-foreground">
                  {t("Total Paid", "实付金额")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Paid via", "支付方式")}: {paymentMethodLabel}
                </div>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-primary">
                {formatPrice(localizedReceipt.totalPaidCents, currencySymbol)}
              </div>
            </div>

            {/* Member Remaining Balances */}
            {hasBalances && (
              <div className="pt-2.5 border-t border-dashed border-border space-y-1 text-[11px]">
                {localizedReceipt.remainingCreditCents != null && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("Remaining Credit Balance", "最新储值余额")}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatPrice(
                        localizedReceipt.remainingCreditCents,
                        currencySymbol
                      )}
                    </span>
                  </div>
                )}
                {localizedReceipt.promoSummaries &&
                  localizedReceipt.promoSummaries.length > 0 && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {t("Promo Balance", "配套余次")}
                      </span>
                      <span className="font-medium text-foreground text-right">
                        {localizedReceipt.promoSummaries.join(" · ")}
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* WhatsApp Phone Input (Allows Walk-ins without phone to receive WhatsApp receipt) */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              <span>
                {t(
                  "Customer WhatsApp Number (optional for Walk-in)",
                  "顾客 WhatsApp 号码（散客可现场输入）"
                )}
              </span>
            </label>
            <Input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t("e.g. 0164738833", "例如 0164738833")}
              className="h-10 sm:h-9 font-mono text-xs bg-card"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 shrink-0 flex-col sm:flex-row">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReceipt}
              className="h-10 sm:h-9 flex-1 sm:flex-initial gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t("Print / PDF", "打印收据")}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopyReceipt()}
              className="h-10 sm:h-9 flex-1 sm:flex-initial gap-1.5 text-xs font-semibold cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? t("Copied", "已复制") : t("Copy", "复制文本")}</span>
            </Button>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors w-full sm:w-auto"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{t("Send WhatsApp", "发送 WhatsApp 收据")}</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
