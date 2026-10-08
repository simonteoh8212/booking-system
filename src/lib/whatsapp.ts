import { format } from "date-fns";

const MERCHANT_WHATSAPP = process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP ?? "";

export interface WhatsAppBookingDetails {
  referenceCode: string;
  serviceName: string;
  startDatetime: Date;
  customerName: string;
  totalPriceCents: number;
}

/**
 * Format price from cents to MYR string.
 */
export function formatPrice(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

/**
 * Build a pre-filled WhatsApp wa.me URL with appointment details.
 * The message prompts the customer to attach their payment screenshot.
 */
export function buildWhatsAppUrl(details: WhatsAppBookingDetails): string {
  const { referenceCode, serviceName, startDatetime, customerName, totalPriceCents } =
    details;

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
  const formattedPrice = formatPrice(totalPriceCents);

  const message = [
    `Hi! I'd like to confirm my appointment booking.`,
    ``,
    `📋 *Booking Reference:* ${referenceCode}`,
    `👤 *Name:* ${customerName}`,
    `💆 *Service:* ${serviceName}`,
    `📅 *Date:* ${formattedDate}`,
    `🕐 *Time:* ${formattedTime}`,
    `💰 *Amount:* ${formattedPrice}`,
    ``,
    `Please find attached my payment receipt/screenshot. Kindly confirm my appointment. Thank you! 🙏`,
  ].join("\n");

  const phone = MERCHANT_WHATSAPP.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}
