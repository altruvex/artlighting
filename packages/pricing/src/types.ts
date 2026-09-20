import type { MoneyInput } from "@repo/money";

/**
 * The pricing engine's vocabulary.
 *
 * Deliberately free of Prisma and of any framework: the admin previews a
 * cart with it, the storefront prices one with it, and the tests run it
 * with plain objects. Anything that needs a database converts at the edge.
 */

export type DiscountType = "PERCENTAGE" | "FIXED";
export type DiscountMode = "AUTOMATIC" | "COUPON";
export type DiscountScope = "PRODUCTS" | "CATEGORIES" | "FAMILIES" | "CART";
export type ProductFamily = "INDOOR" | "OUTDOOR" | "CHANDELIER";

export interface CartLine {
  /** Stable per line, so a result can be matched back to its input. */
  id: string;
  productId: string;
  /** Every category the product belongs to, for CATEGORIES-scoped discounts. */
  categoryIds: string[];
  /** The product's family, for FAMILIES-scoped discounts. */
  family?: ProductFamily | null;
  /** Serialized money — never a float. */
  unitPrice: MoneyInput;
  /** The struck-through "was" price, if any. Display only. */
  compareAtPrice?: MoneyInput | null;
  quantity: number;
}

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  mode: DiscountMode;
  scope: DiscountScope;
  /** FIXED only. */
  amount?: MoneyInput | null;
  /** PERCENTAGE only, and a **rate**: 0.13 = 13%. */
  rate?: MoneyInput | null;
  code?: string | null;
  minOrderValue?: MoneyInput | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usageCount?: number;
  stackable?: boolean;
  priority?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
  /** PRODUCTS scope: the products it covers. */
  productIds?: string[];
  /** CATEGORIES scope: the categories it covers. */
  categoryIds?: string[];
  /** FAMILIES scope: the families it covers. */
  families?: ProductFamily[];
}

export interface CustomerContext {
  userId?: string | null;
  email?: string | null;
  /** How many times this customer has already redeemed each discount. */
  redemptionsByDiscountId?: Record<string, number>;
}

/** Why a discount did not apply. Shown to the customer for a typed coupon. */
export type RejectionReason =
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit_reached"
  | "customer_limit_reached"
  | "below_minimum_order"
  | "no_matching_lines"
  | "not_a_coupon"
  | "unknown_code"
  | "outranked";

export interface AppliedDiscount {
  discountId: string;
  name: string;
  code: string | null;
  scope: DiscountScope;
  /** What it actually took off, in money. */
  amount: string;
}

export interface RejectedDiscount {
  discountId: string;
  name: string;
  code: string | null;
  reason: RejectionReason;
}

export interface PricedLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  compareAtPrice: string | null;
  /** Discount attributed to this line. */
  discount: string;
  /** unitPrice × quantity − discount. Never negative. */
  total: string;
}

export interface PricingResult {
  lines: PricedLine[];
  applied: AppliedDiscount[];
  rejected: RejectedDiscount[];
  /** Before any discount. */
  subtotal: string;
  discountTotal: string;
  /** On the discounted subtotal. */
  tax: string;
  shipping: string;
  grandTotal: string;
}

export interface PricingInput {
  lines: CartLine[];
  discounts: DiscountRule[];
  /** What the customer typed, if anything. Matched case-insensitively. */
  coupon?: string | null;
  customer?: CustomerContext;
  /** Injected rather than read from the clock, so tests are not flaky. */
  now?: Date;
  /** A rate: 0.14 = 14%. */
  taxRate?: MoneyInput;
  shipping?: MoneyInput;
  currency?: string;
}
