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
}

/**
 * Format price from cents to currency string.
 */
export function formatPrice(cents: number, overrideSymbol?: string): string {
  const sym =
    overrideSymbol ?? process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "RM";
  const formatted = (cents / 100).toFixed(2);
  if (sym === "$" || sym === "AUD" || sym === "A$") {
    return `$${formatted}`;
  }
  return `${sym} ${formatted}`;
}

/**
 * Build a pre-filled WhatsApp wa.me URL with appointment details.
 * The message prompts the customer to attach their payment screenshot or notes deposit exemption.
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
  } = details;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(startDatetime);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startDatetime);
  const formattedPrice = formatPrice(totalPriceCents, currencySymbol);

  const hasDeposit =
    !isDepositExempt &&
    depositDueCents != null &&
    depositDueCents > 0 &&
    depositDueCents < totalPriceCents;

  const paymentBreakdown = isDepositExempt
    ? [
        `💰 *Total Price:* ${formattedPrice}`,
        `🌟 *Deposit Status:* Waived (Regular Customer VIP)`,
        `🏷️ *Payment at Salon:* ${formattedPrice} (Pay upon arrival)`,
      ]
    : hasDeposit
    ? [
        `💰 *Total Price:* ${formattedPrice}`,
        `💵 *Deposit Required:* ${formatPrice(depositDueCents, currencySymbol)}`,
        `🏷️ *Balance at Salon:* ${formatPrice(balanceDueCents ?? totalPriceCents - depositDueCents, currencySymbol)}`,
      ]
    : [`💰 *Total Amount:* ${formattedPrice}`];

  const closingMessage = isDepositExempt
    ? `I am a regular customer with deposit waived. Looking forward to seeing you! Thank you! 🙏`
    : `Please find attached my payment receipt/screenshot. Kindly confirm my appointment. Thank you! 🙏`;

  const message = [
    `Hi! I'd like to confirm my appointment booking.`,
    ``,
    `📋 *Booking Reference:* ${referenceCode}`,
    `👤 *Name:* ${customerName}`,
    `💆 *Service:* ${serviceName}`,
    `📅 *Date:* ${formattedDate}`,
    `🕐 *Time:* ${formattedTime}`,
    ...paymentBreakdown,
    ``,
    closingMessage,
  ].join("\n");

  const phone = MERCHANT_WHATSAPP.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}
