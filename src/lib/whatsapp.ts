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

export interface EmergencyApologyDetails {
  customerName: string;
  customerPhone: string;
  referenceCode: string;
  serviceName: string;
  startDatetime: Date | string;
  depositDueCents?: number | null;
  reason: string;
  businessName?: string;
  language?: "en" | "zh";
}

/**
 * Builds a direct 1-click WhatsApp apology and reschedule URL to the customer.
 */
export function buildEmergencyApologyWhatsAppUrl(details: EmergencyApologyDetails): string {
  const {
    customerName,
    customerPhone,
    referenceCode,
    serviceName,
    startDatetime,
    depositDueCents,
    reason,
    businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Our Salon",
    language = "zh",
  } = details;

  const dateObj = typeof startDatetime === "string" ? new Date(startDatetime) : startDatetime;
  const isZh = language === "zh";

  const formattedDate = new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    month: isZh ? "numeric" : "short",
    day: "numeric",
    weekday: isZh ? "short" : "short",
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);

  let msg = "";
  if (isZh) {
    msg = [
      `您好 ${customerName}！这里是 *${businessName}*。`,
      ``,
      `非常抱歉地通知您，由于本店突发状况（*${reason}*），原定于 *${formattedDate} ${formattedTime}* 的预约（*${serviceName}* / 单号：${referenceCode}）无法正常接待。`,
      ``,
      depositDueCents && depositDueCents > 0
        ? `💰 *关于定金：* 您已付的定金已妥善记录，您可以直接在此回复告知方便改期的新时间，或者我们将立刻为您办理全额退款。`
        : `📅 *关于改期：* 您可以直接在此回复告知您方便改约的新日期与时段，我们将优先为您安排！`,
      ``,
      `对您造成的不便，我们深表歉意，敬请谅解！🙏`,
    ].join("\n");
  } else {
    msg = [
      `Hi ${customerName}! This is *${businessName}*.`,
      ``,
      `We sincerely apologize, but due to an unexpected situation today (*${reason}*), we are unable to fulfill your scheduled appointment for *${serviceName}* on *${formattedDate} at ${formattedTime}* (Ref: ${referenceCode}).`,
      ``,
      depositDueCents && depositDueCents > 0
        ? `💰 *Your Deposit:* Your deposit is 100% safe. You can reply directly here with your preferred new date/time to reschedule, or request an immediate full refund.`
        : `📅 *Rescheduling:* Please reply directly here with your preferred new date and time, and we will prioritize your booking!`,
      ``,
      `We truly apologize for the disruption and appreciate your understanding! 🙏`,
    ].join("\n");
  }

  let cleanPhone = customerPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "60" + cleanPhone.slice(1);
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

