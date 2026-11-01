import { isValidMoney, money } from "@repo/money";
import { z } from "zod";

/**
 * What the quotation editor sends. Shared by the form and the server action
 * so "valid" means one thing. Rates are fractions (0.14 = 14%); the editor
 * converts from the percent the admin types before it gets here.
 */

export const QUOTATION_CURRENCIES = ["EGP", "USD", "EUR"] as const;
export const QUOTATION_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

const moneyString = z
  .string()
  .trim()
  .refine((v) => isValidMoney(v) && !money(v).isNegative(), "invalidMoney");

const rateString = z
  .string()
  .trim()
  .refine((v) => isValidMoney(v) && money(v).greaterThanOrEqualTo(0) && money(v).lessThanOrEqualTo(1), "invalidRate");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const quotationLineSchema = z.object({
  productId: z.string().min(1).nullish().transform((v) => v ?? null),
  variantId: z.string().min(1).nullish().transform((v) => v ?? null),
  sku: z.string().trim().max(80).default(""),
  name: z.string().trim().min(1, "lineNameRequired").max(200),
  description: optionalText(1000),
  imageUrl: optionalText(1000),
  quantity: z.number().int("quantityWhole").min(1, "quantityMin").max(1_000_000),
  unitPrice: moneyString,
  discountRate: rateString.default("0"),
});

export const quotationInputSchema = z
  .object({
    customerId: z.string().min(1, "customerRequired"),
    currency: z.enum(QUOTATION_CURRENCIES),
    issueDate: z.coerce.date(),
    validUntil: z.coerce.date(),
    subject: optionalText(200),
    discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable(),
    discountValue: z.string().trim().nullable(),
    taxRate: rateString,
    terms: optionalText(4000),
    notes: optionalText(4000),
    lines: z.array(quotationLineSchema).max(300, "tooManyLines"),
  })
  .superRefine((input, ctx) => {
    if (input.validUntil < input.issueDate) {
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "validBeforeIssue" });
    }
    if (input.discountType) {
      const parsed = (input.discountType === "PERCENTAGE" ? rateString : moneyString).safeParse(
        input.discountValue ?? "",
      );
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "invalidDiscount" });
      }
    }
  });

export type QuotationInput = z.input<typeof quotationInputSchema>;
export type QuotationLineInput = z.input<typeof quotationLineSchema>;

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "customerNameRequired").max(160),
  companyName: optionalText(160),
  email: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "invalidEmail"),
  phone: optionalText(60),
  taxId: optionalText(60),
  address: optionalText(500),
});

export type CustomerInput = z.input<typeof customerInputSchema>;

/** The customer as printed, frozen onto the quotation. */
export interface CustomerSnapshot {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
}

export const DEFAULT_TAX_RATE = "0.14";
export const DEFAULT_VALIDITY_DAYS = 30;

/** English only, like every generated document (D11). Editable per quotation. */
export const DEFAULT_TERMS = [
  "Prices are in the currency shown and include delivery within Greater Cairo.",
  "Payment: 50% advance with the purchase order, the balance on delivery.",
  "Delivery: 2–4 weeks from receipt of the advance payment, subject to stock.",
  "Warranty: 2 years on LED fixtures against manufacturing defects.",
  "This quotation is valid until the date shown above.",
].join("\n");
