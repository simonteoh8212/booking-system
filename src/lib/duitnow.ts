import QRCode from "qrcode";

export const DEFAULT_DUITNOW_PAYLOAD =
  "00020201021126440014A0000006150001010689005302121312040696445204000053034585802MY5913TEOHCHUNSEONG6002MY62130609927401939630425A9";

export interface ParsedDuitNow {
  isValid: boolean;
  recipientName: string;
  accountNumber?: string;
  currency: string;
  isDynamic: boolean;
  existingAmount?: string;
  rawPayload: string;
}

/**
 * Calculate EMVCo standard CRC16-CCITT checksum.
 * Polynomial: 0x1021, Initial: 0xFFFF
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Parse an EMVCo DuitNow QR text string into TLV (Tag-Length-Value) dictionary.
 */
export function parseEMVCoTags(raw: string): Map<string, string> {
  const tags = new Map<string, string>();
  let i = 0;

  while (i < raw.length) {
    if (i + 4 > raw.length) break;
    const tag = raw.substring(i, i + 2);
    const length = parseInt(raw.substring(i + 2, i + 4), 10);
    if (isNaN(length)) break;
    const value = raw.substring(i + 4, i + 4 + length);
    tags.set(tag, value);
    i += 4 + length;
  }

  return tags;
}

/**
 * Extract human-readable details from a DuitNow payload.
 */
export function parseDuitNowPayload(raw: string): ParsedDuitNow {
  const trimmed = raw.trim();
  const tags = parseEMVCoTags(trimmed);

  // Must have Tag 00, 01, and 53 (Currency = 458 for MYR)
  const hasFormat = tags.has("00");
  const hasCurrency = tags.get("53") === "458";
  const recipientName = tags.get("59") || "Merchant";
  const initiationMethod = tags.get("01") || "11";
  const isDynamic = initiationMethod === "12";
  const existingAmount = tags.get("54");

  // Extract account number from Tag 26 if available
  let accountNumber: string | undefined;
  const tag26 = tags.get("26");
  if (tag26) {
    const subTags = parseEMVCoTags(tag26);
    accountNumber = subTags.get("02") || subTags.get("01");
  }

  return {
    isValid: hasFormat && hasCurrency && tags.has("59"),
    recipientName,
    accountNumber,
    currency: "MYR",
    isDynamic,
    existingAmount,
    rawPayload: trimmed,
  };
}

/**
 * Generate a dynamic DuitNow QR payload string for a specific amount.
 * Injects Tag 54 (Amount, e.g. "10.00") and recalculates CRC16.
 */
export function generateDynamicDuitNowPayload(options: {
  basePayload: string;
  amountCents: number;
  referenceCode?: string;
}): string {
  const { basePayload, amountCents, referenceCode } = options;
  const tags = parseEMVCoTags(basePayload.trim());

  // Set Tag 01 to "12" (Dynamic QR)
  tags.set("01", "12");

  // Set Tag 54 to exact formatted amount, e.g. "10.00"
  const amountStr = (amountCents / 100).toFixed(2);
  tags.set("54", amountStr);

  // Ensure Tag 53 is 458 (MYR)
  tags.set("53", "458");

  // Ensure Tag 58 is MY
  tags.set("58", "MY");

  // If referenceCode is provided, update Tag 62 (Additional Data)
  if (referenceCode) {
    const cleanRef = referenceCode.substring(0, 25);
    // Subtag 01: Bill / Reference number
    const subTag01 = `01${String(cleanRef.length).padStart(2, "0")}${cleanRef}`;
    tags.set("62", subTag01);
  }

  // Tags must be assembled in standard EMVCo order
  const orderedTags = [
    "00", "01", "26", "27", "52", "53", "54", "58", "59", "60", "62"
  ];

  let result = "";
  for (const tag of orderedTags) {
    const val = tags.get(tag);
    if (val !== undefined) {
      result += `${tag}${String(val.length).padStart(2, "0")}${val}`;
    }
  }

  // Include any other remaining tags (excluding 63)
  for (const [tag, val] of tags.entries()) {
    if (!orderedTags.includes(tag) && tag !== "63") {
      result += `${tag}${String(val.length).padStart(2, "0")}${val}`;
    }
  }

  // Append Tag 63 header (6304) and calculate new CRC
  const payloadToSign = `${result}6304`;
  const checksum = calculateCRC16(payloadToSign);

  return `${payloadToSign}${checksum}`;
}

/**
 * Generate dynamic DuitNow QR as Data URL (image/png) for rendering in <img src="..." />
 */
export async function generateDuitNowQRDataUrl(options: {
  basePayload?: string;
  amountCents: number;
  referenceCode?: string;
}): Promise<string> {
  const base = options.basePayload?.trim() || DEFAULT_DUITNOW_PAYLOAD;
  const dynamicPayload = generateDynamicDuitNowPayload({
    basePayload: base,
    amountCents: options.amountCents,
    referenceCode: options.referenceCode,
  });

  return QRCode.toDataURL(dynamicPayload, {
    margin: 1,
    width: 320,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}
