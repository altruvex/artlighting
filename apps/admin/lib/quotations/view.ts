import type { QuotationStatus } from "./schema";

/**
 * What crosses Server → Client for the quotation screens. Money and rates are
 * strings (never Decimal, never MoneyInput — see the decimal boundary rule),
 * dates are "YYYY-MM-DD" for the date inputs.
 */

export interface CustomerOption {
  id: string;
  label: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
}

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** The product's own price, for a product with no active variant. */
  price: string;
  variants: { id: string; sku: string; label: string; price: string }[];
}

export interface QuotationLineView {
  productId: string | null;
  variantId: string | null;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  /** Fraction: "0.1000" is 10%. */
  discountRate: string;
}

export interface QuotationView {
  id: string;
  number: string;
  status: QuotationStatus;
  customerId: string;
  currency: string;
  issueDate: string;
  validUntil: string;
  subject: string | null;
  discountType: "PERCENTAGE" | "FIXED" | null;
  /** A rate for PERCENTAGE, money for FIXED. */
  discountValue: string | null;
  taxRate: string;
  terms: string | null;
  notes: string | null;
  lines: QuotationLineView[];
  createdBy: string;
  /** Who answers for the quotation; a manager can hand it to someone else. */
  owner: { id: string; name: string };
  /** Newest first. */
  activity: QuotationActivityView[];
  createdAt: string;
  sentAt: string | null;
  respondedAt: string | null;
  revisionOf: { id: string; number: string } | null;
  revisions: { id: string; number: string }[];
}

export type QuotationActivityAction = "CREATED" | "UPDATED" | "STATUS_CHANGED" | "REVISED" | "ASSIGNED" | "DOCUMENT_EXPORTED";

export interface QuotationActivityView {
  id: string;
  action: QuotationActivityAction;
  actorName: string;
  createdAt: string;
  /** Plain JSON: { from, to } for a status or owner, { format } for a document… */
  detail: Record<string, unknown> | null;
}

export function toDateInput(value: Date): string {
  return value.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

export function quotationStatusTone(status: QuotationStatus) {
  switch (status) {
    case "DRAFT":
      return "neutral" as const;
    case "SENT":
      return "info" as const;
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    case "EXPIRED":
      return "warning" as const;
  }
}
