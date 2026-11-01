/**
 * Sends the order emails for a made-up order, through the real Resend
 * sender, to check the setup end to end:
 *
 *   npx tsx --env-file=.env.local --conditions=react-server scripts/send-test-email.ts [customer@address]
 *
 * The shop copy goes to ORDER_NOTIFY_EMAIL; the customer receipt (both
 * languages) goes to the address given, or to ORDER_NOTIFY_EMAIL.
 */
import { customerEmail, shopEmail } from "@/lib/email/order-emails";
import { orderNotifyRecipients, sendEmail } from "@/lib/email/mailer";
import type { OrderView } from "@/lib/order-view";

const view: OrderView = {
  id: 999999,
  isCompleted: true,
  status: "awaiting_shipment",
  createdAt: new Date().toISOString(),
  subtotal: "4389.00",
  discountTotal: "570.57",
  shippingPrice: "69.00",
  totalPrice: "3887.43",
  itemCount: 3,
  shippingAddress: { fullName: "Test Customer", phoneNumber: "01012345678", address: "12 Street 9, Maadi", city: "Cairo", state: "Cairo", zipCode: "", country: "Egypt" },
  lines: [
    { id: "1", productId: "jy-595-48w", name: "JY-595-48W", image: null, brand: "balcom", href: null, quantity: 2, unitPrice: "1299.00", discountAmount: "337.74", lineTotal: "2260.26", productIp: "IP44", bulb: null },
    { id: "2", productId: "oh1207-s2", name: "OH1207-S2", image: null, brand: "mister-led", href: null, quantity: 1, unitPrice: "1791.00", discountAmount: "232.83", lineTotal: "1558.17", productIp: null, bulb: { name: "LED 9 W", wattage: 9 } },
  ],
};

const shop = orderNotifyRecipients();
const customer = process.argv[2] ?? shop[0]!;
const stamp = Date.now();

const results = await Promise.all([
  sendEmail({ ...shopEmail(view, { name: "Test Customer", email: customer, language: "ar" }), subject: `[TEST] New order #${view.id}`, to: shop, replyTo: customer, idempotencyKey: `test-shop-${stamp}`, tag: "test shop copy" }),
  sendEmail({ ...customerEmail(view, "ar", "عميل تجريبي"), subject: "[TEST] تم تأكيد طلبك", to: customer, replyTo: shop, idempotencyKey: `test-ar-${stamp}`, tag: "test receipt ar" }),
  sendEmail({ ...customerEmail(view, "en", "Test Customer"), subject: "[TEST] Your order is confirmed", to: customer, replyTo: shop, idempotencyKey: `test-en-${stamp}`, tag: "test receipt en" }),
]);
console.log({ shopCopy: results[0], receiptAr: results[1], receiptEn: results[2], from: process.env.EMAIL_FROM, shop, customer });
process.exit(results.every(Boolean) ? 0 : 1);
