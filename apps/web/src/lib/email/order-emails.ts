import "server-only";

import { orderForCustomer, toOrderView } from "@/lib/checkout.server";
import { COMPANY, displayPhone } from "@/lib/company";
import { formatNumberWithConversion } from "@/lib/numbers";
import type { OrderView } from "@/lib/order-view";
import { absoluteUrl } from "@/lib/site";
import { prisma } from "@repo/database";
import { emailDisplayFont, emailLayout, GOLD, MUTED, RULE } from "./layout";
import { escapeHtml, orderNotifyRecipients, sendEmail } from "./mailer";

/**
 * The two emails a confirmed order sends: a receipt to the customer, in the
 * language they ordered in, and a copy to the shop with everything the
 * showroom needs to call the customer and pack the order.
 *
 * Both are built from the same OrderView the thank-you page renders, so
 * the figures in the inbox are the figures that were charged — nothing is
 * recomputed here. Each is sent with an idempotency key made of the order
 * id, so a confirmation that runs twice sends each email once.
 */

type Copy = {
  subject: (id: number) => string;
  preheader: string;
  greeting: (name: string) => string;
  intro: string;
  orderNo: string;
  placed: string;
  product: string;
  qty: string;
  total: string;
  subtotal: string;
  discounts: string;
  delivery: string;
  grandTotal: string;
  payment: string;
  paymentValue: string;
  deliverTo: string;
  next: string;
  steps: string[];
  view: string;
  questions: string;
  code: string;
  protection: string;
  bulb: string;
};

const CUSTOMER: Record<"en" | "ar", Copy> = {
  en: {
    subject: (id) => `Your Art Lighting order #${id} is confirmed`,
    preheader: "We have your order. Here is what you bought and what happens next.",
    greeting: (name) => `Hello ${name},`,
    intro: "Thank you for your order. We have received it and the showroom is preparing it.",
    orderNo: "Order",
    placed: "Placed",
    product: "Product",
    qty: "Qty",
    total: "Total",
    subtotal: "Subtotal",
    discounts: "Discounts",
    delivery: "Delivery",
    grandTotal: "Total to pay",
    payment: "Payment",
    paymentValue: "Cash on delivery",
    deliverTo: "Delivering to",
    next: "What happens next",
    steps: [
      "The showroom may call you to confirm the order and the delivery address.",
      "Orders are delivered within four working days. For addresses outside Cairo, we confirm the delivery cost with you before sending.",
      "You pay in cash when the order arrives.",
    ],
    view: "View your order",
    questions: "Questions about your order? Reply to this email or call the showroom on",
    code: "Code",
    protection: "Protection",
    bulb: "Bulb",
  },
  ar: {
    subject: (id) => `تم تأكيد طلبك رقم ${id} من آرت لايتنج`,
    preheader: "استلمنا طلبك. هذه تفاصيله وما سيحدث بعد ذلك.",
    greeting: (name) => `مرحبًا ${name}،`,
    intro: "شكرًا لطلبك. استلمناه ويقوم المعرض بتجهيزه الآن.",
    orderNo: "رقم الطلب",
    placed: "تاريخ الطلب",
    product: "المنتج",
    qty: "الكمية",
    total: "الإجمالي",
    subtotal: "المجموع الفرعي",
    discounts: "الخصومات",
    delivery: "التوصيل",
    grandTotal: "الإجمالي المطلوب",
    payment: "الدفع",
    paymentValue: "الدفع عند الاستلام",
    deliverTo: "عنوان التوصيل",
    next: "ما الذي سيحدث بعد ذلك",
    steps: [
      "قد يتصل بك المعرض لتأكيد الطلب وعنوان التوصيل.",
      "يتم توصيل الطلبات خلال أربعة أيام عمل. وللعناوين خارج القاهرة نؤكد معك تكلفة التوصيل قبل الإرسال.",
      "تدفع نقدًا عند وصول الطلب.",
    ],
    view: "عرض طلبك",
    questions: "لديك سؤال عن طلبك؟ رُد على هذه الرسالة أو اتصل بالمعرض على",
    code: "الكود",
    protection: "درجة الحماية",
    bulb: "اللمبة",
  },
};

function money(amount: string, locale: string) {
  return escapeHtml(formatNumberWithConversion(amount, locale));
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

/** The lines and the totals, as one table. Shared by both emails. */
function orderTable(view: OrderView, locale: string, copy: Copy) {
  const end = locale === "ar" ? "left" : "right";
  const lines = view.lines
    .map((line) => {
      const details = [
        `${copy.code} ${escapeHtml(line.productId.toUpperCase())}`,
        line.productIp ? `${copy.protection} ${escapeHtml(line.productIp)}` : null,
        line.bulb ? `${copy.bulb}: ${escapeHtml(line.bulb.name)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${RULE};vertical-align:top;">
<div style="font-weight:600;">${escapeHtml(line.name)}</div>
<div style="font-size:12px;color:${MUTED};">${details}</div>
</td>
<td style="padding:12px 8px;border-bottom:1px solid ${RULE};vertical-align:top;text-align:center;white-space:nowrap;">${line.quantity}</td>
<td style="padding:12px 0;border-bottom:1px solid ${RULE};vertical-align:top;text-align:${end};white-space:nowrap;">${money(line.lineTotal, locale)}</td>
</tr>`;
    })
    .join("");

  const row = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:6px 0;${strong ? "font-weight:600;font-size:16px;" : `color:${MUTED};`}">${label}</td><td style="padding:6px 0;text-align:${end};white-space:nowrap;${strong ? "font-weight:600;font-size:16px;" : ""}">${value}</td></tr>`;

  const hasDiscount = Number(view.discountTotal) > 0;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;font-size:14px;">
<tr>
<th style="padding:0 0 8px;border-bottom:1px solid ${RULE};font-size:12px;font-weight:600;color:${MUTED};text-align:inherit;">${copy.product}</th>
<th style="padding:0 8px 8px;border-bottom:1px solid ${RULE};font-size:12px;font-weight:600;color:${MUTED};text-align:center;">${copy.qty}</th>
<th style="padding:0 0 8px;border-bottom:1px solid ${RULE};font-size:12px;font-weight:600;color:${MUTED};text-align:${end};">${copy.total}</th>
</tr>
${lines}
${row(copy.subtotal, money(view.subtotal, locale))}
${hasDiscount ? row(copy.discounts, `− ${money(view.discountTotal, locale)}`) : ""}
${row(copy.delivery, money(view.shippingPrice, locale))}
${row(copy.grandTotal, money(view.totalPrice, locale), true)}
</table>`;
}

function addressBlock(view: OrderView) {
  const address = view.shippingAddress;
  if (!address) return "";
  return [
    escapeHtml(address.fullName),
    `<span dir="ltr">${escapeHtml(address.phoneNumber)}</span>`,
    escapeHtml(address.address),
    escapeHtml([address.city, address.state, address.zipCode].filter(Boolean).join(", ")),
    escapeHtml(address.country),
  ]
    .filter(Boolean)
    // An address typed in Latin inside an Arabic email: each line keeps its
    // own direction, so "12 Street 9, Maadi" does not come out "Street 9, Maadi 12".
    .map((line) => `<span dir="auto">${line}</span>`)
    .join("<br>");
}

export function customerEmail(view: OrderView, locale: "en" | "ar", name: string) {
  const copy = CUSTOMER[locale];
  const url = absoluteUrl(locale, `/thank-you?orderId=${view.id}`);
  const phone = displayPhone(COMPANY.phones.showroom);

  const body = `
<p style="margin:0 0 4px;font-family:${emailDisplayFont(locale)};font-size:24px;font-weight:500;">${escapeHtml(copy.greeting(name))}</p>
<p style="margin:0 0 20px;">${escapeHtml(copy.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr>
<td style="padding:4px 0;color:${MUTED};">${copy.orderNo}</td><td style="padding:4px 0;font-weight:600;">#${view.id}</td>
</tr>
<tr>
<td style="padding:4px 0;color:${MUTED};">${copy.placed}</td><td style="padding:4px 0;">${escapeHtml(formatDate(view.createdAt, locale))}</td>
</tr>
<tr>
<td style="padding:4px 0;color:${MUTED};">${copy.payment}</td><td style="padding:4px 0;">${copy.paymentValue}</td>
</tr>
</table>
${orderTable(view, locale, copy)}
<p style="margin:0 0 6px;font-weight:600;">${copy.deliverTo}</p>
<p style="margin:0 0 24px;color:${MUTED};font-size:14px;">${addressBlock(view)}</p>
<p style="margin:0 0 6px;font-weight:600;">${copy.next}</p>
<ol style="margin:0 0 24px;padding-${locale === "ar" ? "right" : "left"}:20px;font-size:14px;">
${copy.steps.map((step) => `<li style="margin:0 0 6px;">${escapeHtml(step)}</li>`).join("")}
</ol>
<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px;">${copy.view}</a></p>
<p style="margin:0 0 20px;font-size:14px;color:${MUTED};">${copy.questions} <a href="tel:${COMPANY.phones.showroom}" dir="ltr" style="color:${GOLD};">${phone}</a></p>`;

  const text = [
    copy.greeting(name),
    copy.intro,
    "",
    `${copy.orderNo}: #${view.id}`,
    `${copy.placed}: ${formatDate(view.createdAt, locale)}`,
    `${copy.payment}: ${copy.paymentValue}`,
    "",
    ...view.lines.map((line) => `${line.quantity} × ${line.name} (${line.productId.toUpperCase()}) — ${formatNumberWithConversion(line.lineTotal, locale)}`),
    "",
    `${copy.subtotal}: ${formatNumberWithConversion(view.subtotal, locale)}`,
    ...(Number(view.discountTotal) > 0 ? [`${copy.discounts}: −${formatNumberWithConversion(view.discountTotal, locale)}`] : []),
    `${copy.delivery}: ${formatNumberWithConversion(view.shippingPrice, locale)}`,
    `${copy.grandTotal}: ${formatNumberWithConversion(view.totalPrice, locale)}`,
    "",
    `${copy.next}:`,
    ...copy.steps.map((step) => `- ${step}`),
    "",
    `${copy.view}: ${url}`,
    `${copy.questions} ${phone}`,
  ].join("\n");

  return {
    subject: copy.subject(view.id),
    html: emailLayout({ locale, preheader: copy.preheader, body }),
    text,
  };
}

export function shopEmail(view: OrderView, customer: { name: string; email: string; language: string }) {
  const copy = CUSTOMER.en;
  const address = view.shippingAddress;
  const phone = address?.phoneNumber ?? "";
  const whatsapp = phone ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "20")}` : null;

  const body = `
<p style="margin:0 0 4px;font-family:${emailDisplayFont("en")};font-size:24px;font-weight:500;">New order #${view.id}</p>
<p style="margin:0 0 20px;color:${MUTED};">${escapeHtml(formatDate(view.createdAt, "en"))} · ${view.itemCount} item${view.itemCount === 1 ? "" : "s"} · ${money(view.totalPrice, "en")} · cash on delivery</p>
<p style="margin:0 0 6px;font-weight:600;">Customer</p>
<p style="margin:0 0 20px;font-size:14px;">
${escapeHtml(customer.name)}<br>
<a href="mailto:${escapeHtml(customer.email)}" style="color:${GOLD};">${escapeHtml(customer.email)}</a><br>
${phone ? `<a href="tel:${escapeHtml(phone)}" style="color:${GOLD};">${escapeHtml(phone)}</a>${whatsapp ? ` · <a href="${whatsapp}" style="color:${GOLD};">WhatsApp</a>` : ""}<br>` : ""}
Ordered in ${customer.language === "ar" ? "Arabic" : "English"}
</p>
<p style="margin:0 0 6px;font-weight:600;">Deliver to</p>
<p style="margin:0 0 8px;font-size:14px;color:${MUTED};">${addressBlock(view) || "No address on the order."}</p>
${address && !/cairo|القاهرة/i.test(`${address.city} ${address.state}`) ? `<p style="margin:0 0 8px;font-size:14px;color:${GOLD};font-weight:600;">Outside Cairo — confirm the delivery cost with the customer before dispatch.</p>` : ""}
${orderTable(view, "en", copy)}`;

  const text = [
    `New order #${view.id} — ${formatNumberWithConversion(view.totalPrice, "en")}, cash on delivery`,
    `Customer: ${customer.name} <${customer.email}> ${phone}`,
    address ? `Deliver to: ${[address.fullName, address.address, address.city, address.state, address.country].filter(Boolean).join(", ")}` : "No address on the order.",
    "",
    ...view.lines.map((line) => `${line.quantity} × ${line.name} (${line.productId.toUpperCase()})${line.productIp ? ` ${line.productIp}` : ""}${line.bulb ? ` — ${line.bulb.name}` : ""} — ${formatNumberWithConversion(line.lineTotal, "en")}`),
    "",
    `Subtotal ${formatNumberWithConversion(view.subtotal, "en")} · Discounts ${formatNumberWithConversion(view.discountTotal, "en")} · Delivery ${formatNumberWithConversion(view.shippingPrice, "en")} · Total ${formatNumberWithConversion(view.totalPrice, "en")}`,
  ].join("\n");

  return {
    subject: `New order #${view.id} — ${customer.name} — ${formatNumberWithConversion(view.totalPrice, "en")}`,
    html: emailLayout({ locale: "en", preheader: `New order from ${customer.name}`, body }),
    text,
  };
}

/**
 * Sends both emails for a confirmed order. Call it once the order is
 * complete; it reads everything it needs from the database and never
 * throws — see sendEmail.
 */
export async function sendOrderConfirmationEmails(orderId: number, userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const english = await orderForCustomer(orderId, userId, "en");
    if (!english || !english.isCompleted) return;

    const language: "en" | "ar" = english.customerLanguage === "en" ? "en" : "ar";
    const localized = language === "en" ? english : await orderForCustomer(orderId, userId, "ar");
    const customerView = toOrderView(localized ?? english, language);
    const shopView = toOrderView(english, "en");
    const name = customerView.shippingAddress?.fullName || user?.name || (language === "ar" ? "عميلنا العزيز" : "there");
    const replyTo = orderNotifyRecipients();

    const sends: Promise<boolean>[] = [];
    if (user?.email) {
      const email = customerEmail(customerView, language, name);
      sends.push(
        sendEmail({ ...email, to: user.email, replyTo, idempotencyKey: `order-${orderId}-customer`, tag: `order #${orderId} receipt` }),
      );
    }
    const shop = shopEmail(shopView, { name, email: user?.email ?? "", language });
    sends.push(
      sendEmail({
        ...shop,
        to: replyTo,
        replyTo: user?.email || undefined,
        idempotencyKey: `order-${orderId}-shop`,
        tag: `order #${orderId} shop copy`,
      }),
    );
    await Promise.all(sends);
  } catch (error) {
    console.error(`[email] order #${orderId}: could not build the confirmation emails:`, error);
  }
}
