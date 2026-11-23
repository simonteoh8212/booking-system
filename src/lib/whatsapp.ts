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
  } else if (cleanPhone.startsWith("1") && (cleanPhone.length === 9 || cleanPhone.length === 10)) {
    cleanPhone = "60" + cleanPhone;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

export interface MemberCreditWhatsAppDetails {
  customerName: string;
  customerPhone: string;
  action: "RELOAD" | "DEDUCT" | "BALANCE";
  amountCents?: number;
  newBalanceCents: number;
  currencySymbol?: string;
  referenceCode?: string;
  businessName?: string;
  language?: "en" | "zh";
}

export function buildMemberCreditWhatsAppUrl(details: MemberCreditWhatsAppDetails): string {
  const {
    customerName,
    customerPhone,
    action,
    amountCents = 0,
    newBalanceCents,
    currencySymbol = "RM",
    referenceCode,
    businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Our Salon",
    language = "zh",
  } = details;

  const isZh = language === "zh";
  const fmt = (c: number) => `${currencySymbol} ${(c / 100).toFixed(2)}`;

  let msg = "";
  if (isZh) {
    if (action === "RELOAD") {
      msg = [
        `您好 ${customerName}！感谢您在 *${businessName}* 充值会员储值。`,
        ``,
        `本次充值：*+${fmt(amountCents)}*`,
        `最新储值余额：*${fmt(newBalanceCents)}*`,
        ``,
        `此消息为您的储值凭证，如有任何疑问欢迎随时联系我们。`,
      ].join("\n");
    } else if (action === "DEDUCT") {
      msg = [
        `您好 ${customerName}！感谢今日光临 *${businessName}*。`,
        ``,
        ...(referenceCode ? [`单号：${referenceCode}`] : []),
        `本次储值扣款：*-${fmt(amountCents)}*`,
        `剩余储值余额：*${fmt(newBalanceCents)}*`,
        ``,
        `期待下次为您服务！`,
      ].join("\n");
    } else {
      msg = [
        `您好 ${customerName}！这里是 *${businessName}*。`,
        ``,
        `您目前的会员储值余额为：*${fmt(newBalanceCents)}*`,
        ``,
        `欢迎随时预约到店！`,
      ].join("\n");
    }
  } else {
    if (action === "RELOAD") {
      msg = [
        `Hi ${customerName}! Thank you for reloading your member credit at *${businessName}*.`,
        ``,
        `Amount Credited: *+${fmt(amountCents)}*`,
        `New Credit Balance: *${fmt(newBalanceCents)}*`,
        ``,
        `Please keep this message as your balance receipt.`,
      ].join("\n");
    } else if (action === "DEDUCT") {
      msg = [
        `Hi ${customerName}! Thank you for visiting *${businessName}* today.`,
        ``,
        ...(referenceCode ? [`Ref: ${referenceCode}`] : []),
        `Credit Used: *-${fmt(amountCents)}*`,
        `Remaining Balance: *${fmt(newBalanceCents)}*`,
        ``,
        `We look forward to seeing you again!`,
      ].join("\n");
    } else {
      msg = [
        `Hi ${customerName}! This is *${businessName}*.`,
        ``,
        `Your current member credit balance is: *${fmt(newBalanceCents)}*`,
        ``,
        `Let us know anytime you would like to book an appointment!`,
      ].join("\n");
    }
  }

  let cleanPhone = customerPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "60" + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith("1") && (cleanPhone.length === 9 || cleanPhone.length === 10)) {
    cleanPhone = "60" + cleanPhone;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

export interface CustomerReceiptLineItem {
  name: string;
  originalPriceCents: number;
  paidPriceCents: number;
  promoLabel?: string | null;
}

export interface CustomerReceiptData {
  referenceCode: string;
  timestampIso: string;
  customerName: string;
  customerPhone?: string | null;
  items: CustomerReceiptLineItem[];
  subtotalCents: number;
  promoDiscountCents?: number;
  depositPaidCents?: number;
  creditUsedCents?: number;
  remainingCreditCents?: number | null;
  promoSummaries?: string[];
  totalPaidCents: number;
  paymentMethod: "CASH" | "DUITNOW_QR" | "CARD" | "OTHER" | string;
}

export function formatCustomerReceiptText(
  receipt: CustomerReceiptData,
  options?: {
    language?: "en" | "zh";
    businessName?: string;
    currencySymbol?: string;
  }
): string {
  const isZh = options?.language === "zh";
  const businessName =
    options?.businessName || process.env.NEXT_PUBLIC_BUSINESS_NAME || "Our Salon";
  const currencySymbol =
    options?.currencySymbol || process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "RM";
  const fmt = (c: number) => `${currencySymbol} ${(c / 100).toFixed(2)}`;

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

  const methodLabel =
    receipt.paymentMethod === "CASH"
      ? isZh
        ? "现金 Cash"
        : "Cash"
      : receipt.paymentMethod === "DUITNOW_QR"
      ? "DuitNow QR"
      : receipt.paymentMethod === "CARD"
      ? isZh
        ? "刷卡 Card"
        : "Card"
      : isZh
      ? "会员储值 / 配套"
      : "Credit / Promo";

  const lines: string[] = [];
  lines.push(`🧾 *${businessName}* — ${isZh ? "消费收据" : "Official Receipt"}`);
  lines.push(`${isZh ? "单号" : "Ref"}: ${receipt.referenceCode}`);
  lines.push(`${isZh ? "时间" : "Date"}: ${formattedDateTime}`);
  lines.push(`${isZh ? "顾客" : "Customer"}: ${receipt.customerName}`);
  lines.push(`--------------------------------`);

  for (const item of receipt.items) {
    if (item.promoLabel) {
      lines.push(
        `• ${item.name}: ${fmt(0)} (${isZh ? "配套抵扣" : "Promo"}: ${item.promoLabel})`
      );
    } else {
      lines.push(`• ${item.name}: ${fmt(item.paidPriceCents)}`);
    }
  }

  lines.push(`--------------------------------`);

  const hasDeductions =
    (receipt.promoDiscountCents ?? 0) > 0 ||
    (receipt.depositPaidCents ?? 0) > 0 ||
    (receipt.creditUsedCents ?? 0) > 0;

  if (hasDeductions) {
    lines.push(`${isZh ? "消费小计" : "Subtotal"}: ${fmt(receipt.subtotalCents)}`);
    if ((receipt.promoDiscountCents ?? 0) > 0) {
      lines.push(
        `${isZh ? "配套抵扣" : "Promo Redeemed"}: -${fmt(receipt.promoDiscountCents ?? 0)}`
      );
    }
    if ((receipt.depositPaidCents ?? 0) > 0) {
      lines.push(
        `${isZh ? "已付定金" : "Deposit Paid"}: -${fmt(receipt.depositPaidCents ?? 0)}`
      );
    }
    if ((receipt.creditUsedCents ?? 0) > 0) {
      lines.push(
        `${isZh ? "储值扣款" : "Member Credit Used"}: -${fmt(receipt.creditUsedCents ?? 0)}`
      );
    }
  }

  lines.push(
    `${isZh ? "实付金额" : "Total Paid"}: *${fmt(receipt.totalPaidCents)}* (${methodLabel})`
  );

  const hasBalances =
    receipt.remainingCreditCents != null ||
    (receipt.promoSummaries && receipt.promoSummaries.length > 0);

  if (hasBalances) {
    lines.push(``);
    if (receipt.remainingCreditCents != null) {
      lines.push(
        `${isZh ? "最新储值余额" : "Remaining Credit"}: *${fmt(receipt.remainingCreditCents)}*`
      );
    }
    if (receipt.promoSummaries && receipt.promoSummaries.length > 0) {
      lines.push(
        `${isZh ? "配套余次" : "Promo Balance"}: ${receipt.promoSummaries.join(" · ")}`
      );
    }
  }

  lines.push(``);
  lines.push(
    isZh
      ? `感谢光临 *${businessName}*，期待再次为您服务！`
      : `Thank you for visiting *${businessName}*! We look forward to seeing you again.`
  );

  return lines.join("\n");
}

export function buildCustomerReceiptWhatsAppUrl(
  receipt: CustomerReceiptData,
  options?: {
    phoneOverride?: string;
    language?: "en" | "zh";
    businessName?: string;
    currencySymbol?: string;
  }
): string {
  const msg = formatCustomerReceiptText(receipt, options);
  const rawPhone = (options?.phoneOverride ?? receipt.customerPhone ?? "").trim();
  const isPlaceholder = rawPhone.startsWith("WALKIN-");
  let cleanPhone = isPlaceholder ? "" : rawPhone.replace(/\D/g, "");

  if (cleanPhone.startsWith("0")) {
    cleanPhone = "60" + cleanPhone.slice(1);
  } else if (
    cleanPhone.startsWith("1") &&
    (cleanPhone.length === 9 || cleanPhone.length === 10)
  ) {
    cleanPhone = "60" + cleanPhone;
  }

  if (!cleanPhone) {
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

