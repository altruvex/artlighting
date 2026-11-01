import "server-only";

import { COMPANY, displayPhone } from "@/lib/company";
import { SITE_URL } from "@/lib/site";
import { escapeHtml } from "./mailer";

/**
 * The frame every email is set in: the site's palette (warm off-white,
 * near-black ink, one gold rule), a single 600px column, and tables for
 * layout because that is what mail clients render reliably. The direction
 * follows the language, so an Arabic receipt reads right to left down to
 * the alignment of the price column.
 */
export const INK = "#1c1916";
export const MUTED = "#6f6860";
export const RULE = "#e4dfd8";
export const GOLD = "#a0712b";
export const GROUND = "#f7f5f2";

/** The documents' display face for a heading, with mail-safe fallbacks. */
export function emailDisplayFont(locale: string) {
  return locale === "ar"
    ? "'Alexandria', 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "'Jost', 'Futura', 'Century Gothic', -apple-system, Arial, sans-serif";
}

export function emailLayout({
  locale,
  preheader,
  body,
}: {
  locale: string;
  /** The line a mail client shows beside the subject. */
  preheader: string;
  body: string;
}) {
  const ar = locale === "ar";
  const dir = ar ? "rtl" : "ltr";
  const align = ar ? "right" : "left";
  const font = ar
    ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "'IBM Plex Sans', -apple-system, 'Segoe UI', Arial, sans-serif";
  // The wordmark and headings in the documents' face (Jost / Alexandria).
  // Apple Mail and iOS load it from the <link>; Gmail and Outlook ignore web
  // fonts and fall back down the list, which still reads cleanly.
  const displayFont = emailDisplayFont(locale);
  const footer = ar
    ? `آرت لايتنج · ${escapeHtml("٤٩ شارع الشهيد سيد زكريا، شيراتون المطار، النزهة، القاهرة")}<br>السبت – الخميس، ٩:٣٠ص – ٥:٣٠م`
    : `Art Lighting · 49 El Shaheed Sayed Zakaria St, Sheraton Al Matar, El Nozha, Cairo<br>Saturday – Thursday, 9:30am – 5:30pm`;

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=${ar ? "Alexandria:wght@400;500" : "Jost:wght@400;500"}&display=swap" rel="stylesheet">
<title>${escapeHtml(preheader)}</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="${dir}" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${RULE};font-family:${font};color:${INK};text-align:${align};">
<tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${GOLD};">
<a href="${SITE_URL}/${locale}" style="text-decoration:none;color:${INK};font-family:${displayFont};font-size:${ar ? "18px" : "15px"};font-weight:500;letter-spacing:${ar ? "0" : "0.24em"};">${ar ? "آرت لايتنج" : "ART LIGHTING"}</a>
</td></tr>
<tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6;">
${body}
</td></tr>
<tr><td style="padding:24px 32px 28px;border-top:1px solid ${RULE};font-size:12px;line-height:1.7;color:${MUTED};">
${footer}<br>
<a href="tel:${COMPANY.phones.showroom}" style="color:${MUTED};" dir="ltr">${displayPhone(COMPANY.phones.showroom)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
