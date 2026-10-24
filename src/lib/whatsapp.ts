import { format } from "date-fns";

const MERCHANT_WHATSAPP = process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP ?? "";

export interface WhatsAppBookingDetails {
  referenceCode: string;
  serviceName: string;
  startDatetime: Date;
  customerName: string;
  totalPriceCents: number;
  depositDueCents?: number | null;
  balanceDueCents?: number | null;
  isDepositExempt?: boolean;
  currencySymbol?: string;
  language?: "en" | "zh";
}

/**
 * Format price from cents to currency string (Malaysia Ringgit RM).
 */
export function formatPrice(cents: number, overrideSymbol?: string): string {
  const sym =
    overrideSymbol ?? process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "RM";
  const formatted = (cents / 100).toFixed(2);
  return `${sym} ${formatted}`;
}

/**
 * Build a pre-filled WhatsApp wa.me URL with appointment details.
 * The message prompts the customer to attach their payment screenshot or notes deposit exemption.
 * Supports auto-matching customer language (en / zh).
 */
export function buildWhatsAppUrl(details: WhatsAppBookingDetails): string {
  const {
    referenceCode,
    serviceName,
    startDatetime,
    customerName,
    totalPriceCents,
    depositDueCents,
    balanceDueCents,
    isDepositExempt,
    currencySymbol,
    language = "en",
  } = details;

  const isZh = language === "zh";

  let formattedDate: string;
  let formattedTime: string;

  if (isZh) {
    const yearMonthDay = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(startDatetime);

    const weekday = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
    }).format(startDatetime);

    formattedDate = `${yearMonthDay} (${weekday})`;

    const rawTime = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(startDatetime);
    formattedTime = rawTime.replace(/([上下]午)(\d)/, "$1 $2");
  } else {
    formattedDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(startDatetime);

    formattedTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(startDatetime);
  }

  const formattedPrice = formatPrice(totalPriceCents, currencySymbol);

  const hasDeposit =
    !isDepositExempt &&
    depositDueCents != null &&
    depositDueCents > 0 &&
    depositDueCents < totalPriceCents;

  const depositFormatted = formatPrice(depositDueCents ?? 0, currencySymbol);
  const balanceFormatted = formatPrice(
    balanceDueCents ?? (totalPriceCents - (depositDueCents ?? 0)),
    currencySymbol
  );

  let paymentBreakdown: string[];
  let greeting: string;
  let closingMessage: string;
  let lines: string[];

  if (isZh) {
    greeting = `您好！我想确认我的预约。`;

    if (isDepositExempt) {
      paymentBreakdown = [
        `• *消费总额:* ${formattedPrice}`,
        `• *定金状态:* 熟客免收 (VIP特权)`,
        `• *到店支付:* ${formattedPrice} (到店付款)`,
      ];
      closingMessage = `我是老顾客（已免付定金）。期待与您见面，谢谢！`;
    } else if (hasDeposit) {
      paymentBreakdown = [
        `• *消费总额:* ${formattedPrice}`,
        `• *需付定金:* ${depositFormatted}`,
        `• *到店支付余额:* ${balanceFormatted}`,
      ];
      closingMessage = `附件为我的转账收据截图，请核对并确认我的预约。谢谢！`;
    } else {
      paymentBreakdown = [`• *应付总额:* ${formattedPrice}`];
      closingMessage = `附件为我的转账收据截图，请核对并确认我的预约。谢谢！`;
    }

    lines = [
      greeting,
      ``,
      `• *预约单号:* ${referenceCode}`,
      `• *顾客姓名:* ${customerName}`,
      `• *预约项目:* ${serviceName}`,
      `• *预约日期:* ${formattedDate}`,
      `• *预约时间:* ${formattedTime}`,
      ...paymentBreakdown,
      ``,
      closingMessage,
    ];
  } else {
    greeting = `Hi! I'd like to confirm my appointment booking.`;

    if (isDepositExempt) {
      paymentBreakdown = [
        `• *Total Price:* ${formattedPrice}`,
        `• *Deposit Status:* Waived (Regular Customer VIP)`,
        `• *Payment at Salon:* ${formattedPrice} (Pay upon arrival)`,
      ];
      closingMessage = `I am a regular customer with deposit waived. Looking forward to seeing you! Thank you!`;
    } else if (hasDeposit) {
      paymentBreakdown = [
        `• *Total Price:* ${formattedPrice}`,
        `• *Deposit Required:* ${depositFormatted}`,
        `• *Balance at Salon:* ${balanceFormatted}`,
      ];
      closingMessage = `Please find attached my payment receipt/screenshot. Kindly confirm my appointment. Thank you!`;
    } else {
      paymentBreakdown = [`• *Total Amount:* ${formattedPrice}`];
      closingMessage = `Please find attached my payment receipt/screenshot. Kindly confirm my appointment. Thank you!`;
    }

    lines = [
      greeting,
      ``,
      `• *Booking Reference:* ${referenceCode}`,
      `• *Name:* ${customerName}`,
      `• *Service:* ${serviceName}`,
      `• *Date:* ${formattedDate}`,
      `• *Time:* ${formattedTime}`,
      ...paymentBreakdown,
      ``,
      closingMessage,
    ];
  }

  const message = lines.join("\n");
  const phone = MERCHANT_WHATSAPP.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}
