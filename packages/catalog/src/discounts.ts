import { money, serializeMoney, serializeRate } from "@repo/money";
import { computePricing } from "@repo/pricing";
import { z } from "zod";
import { prisma, type Db } from "./client";
import { productFamilies, type ProductFamily } from "./families";
import { moneySchema, rateSchema } from "./schemas";

/**
 * Writing and redeeming discounts.
 *
 * Deciding what a cart pays lives in @repo/pricing, which is pure and has
 * no database. This is the half that needs one: creating a promotion,
 * checking a coupon against the rules, and recording a redemption without
 * letting two concurrent checkouts share the last use of it.
 */

export const discountScopes = ["PRODUCTS", "CATEGORIES", "FAMILIES", "CART"] as const;

export const discountTypes = ["PERCENTAGE", "FIXED"] as const;
export const discountModes = ["AUTOMATIC", "COUPON"] as const;

/** Upper-cased and trimmed, because lookup is case-insensitive. */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "A code may only contain letters, digits, underscore and hyphen")
  .transform((code) => code.toUpperCase());

export const discountInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(discountTypes),
    mode: z.enum(discountModes),
    scope: z.enum(discountScopes),
    /** PERCENTAGE: a rate. FIXED: an amount. Exactly one, matching `type`. */
    rate: rateSchema.optional(),
    amount: moneySchema.optional(),
    code: couponCodeSchema.nullish(),
    minOrderValue: moneySchema.nullish(),
    usageLimit: z.number().int().positive().nullish(),
    perCustomerLimit: z.number().int().positive().nullish(),
    stackable: z.boolean().default(false),
    priority: z.number().int().min(0).max(1000).default(0),
    startsAt: z.date().nullish(),
    endsAt: z.date().nullish(),
    isActive: z.boolean().default(true),
    productIds: z.array(z.string()).default([]),
    categoryIds: z.array(z.string()).default([]),
    families: z.array(z.enum(productFamilies)).default([]),
  })
  // The same rules the CHECK constraints enforce, stated here so the admin
  // gets a sentence instead of a database error.
  .refine((d) => (d.type === "PERCENTAGE" ? d.rate != null && d.amount == null : true), {
    message: "A percentage discount needs a rate and no amount",
    path: ["rate"],
  })
  .refine((d) => (d.type === "FIXED" ? d.amount != null && d.rate == null : true), {
    message: "A fixed discount needs an amount and no rate",
    path: ["amount"],
  })
  .refine((d) => (d.mode === "COUPON" ? Boolean(d.code) : !d.code), {
    message: "A coupon needs a code; an automatic discount must not have one",
    path: ["code"],
  })
  .refine((d) => (d.scope === "PRODUCTS" ? d.productIds.length > 0 : true), {
    message: "Choose at least one product",
    path: ["productIds"],
  })
  .refine((d) => (d.scope === "CATEGORIES" ? d.categoryIds.length > 0 : true), {
    message: "Choose at least one category",
    path: ["categoryIds"],
  })
  .refine((d) => (d.scope === "FAMILIES" ? d.families.length > 0 : true), {
    message: "Choose at least one family",
    path: ["families"],
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, {
    message: "The end date must be after the start date",
    path: ["endsAt"],
  });

export type DiscountInput = z.infer<typeof discountInputSchema>;

/** Raised when a code is taken, so the caller can say which one. */
export class DuplicateCouponCodeError extends Error {
  constructor(readonly code: string) {
    super(`The code ${code} is already in use`);
    this.name = "DuplicateCouponCodeError";
  }
}

function writeData(input: DiscountInput) {
  return {
    name: input.name,
    type: input.type,
    mode: input.mode,
    scope: input.scope,
    rate: input.type === "PERCENTAGE" ? input.rate : null,
    amount: input.type === "FIXED" ? input.amount : null,
    code: input.mode === "COUPON" ? (input.code ?? null) : null,
    minOrderValue: input.minOrderValue ?? null,
    usageLimit: input.usageLimit ?? null,
    perCustomerLimit: input.perCustomerLimit ?? null,
    stackable: input.stackable,
    priority: input.priority,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
  };
}

/** Targets are replaced wholesale, so the rows always match the form. */
async function replaceTargets(db: Db, discountId: string, input: DiscountInput) {
  await db.discountProduct.deleteMany({ where: { discountId } });
  await db.discountCategory.deleteMany({ where: { discountId } });
  await db.discountFamily.deleteMany({ where: { discountId } });

  if (input.scope === "PRODUCTS" && input.productIds.length) {
    await db.discountProduct.createMany({
      data: input.productIds.map((productId) => ({ discountId, productId })),
    });
  }
  if (input.scope === "CATEGORIES" && input.categoryIds.length) {
    await db.discountCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({ discountId, categoryId })),
    });
  }
  if (input.scope === "FAMILIES" && input.families.length) {
    await db.discountFamily.createMany({
      data: input.families.map((family) => ({ discountId, family })),
    });
  }
}

export async function createDiscount(input: DiscountInput) {
  const data = discountInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    if (data.code) {
      const existing = await tx.discount.findUnique({ where: { code: data.code }, select: { id: true } });
      if (existing) throw new DuplicateCouponCodeError(data.code);
    }
    const discount = await tx.discount.create({ data: writeData(data) });
    await replaceTargets(tx, discount.id, data);
    return discount;
  });
}

export async function updateDiscount(discountId: string, input: DiscountInput) {
  const data = discountInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    if (data.code) {
      const existing = await tx.discount.findUnique({ where: { code: data.code }, select: { id: true } });
      if (existing && existing.id !== discountId) throw new DuplicateCouponCodeError(data.code);
    }
    const discount = await tx.discount.update({ where: { id: discountId }, data: writeData(data) });
    await replaceTargets(tx, discountId, data);
    return discount;
  });
}

export async function setDiscountActive(discountId: string, isActive: boolean) {
  return prisma.discount.update({ where: { id: discountId }, data: { isActive } });
}

/** The shape @repo/pricing wants, from the shape the database holds. */
export function toPricingRule(row: {
  id: string;
  name: string;
  type: string;
  mode: string;
  scope: string;
  rate: unknown;
  amount: unknown;
  code: string | null;
  minOrderValue: unknown;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usageCount: number;
  stackable: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  products?: { productId: string }[];
  categories?: { categoryId: string }[];
  families?: { family: string }[];
}) {
  return {
    id: row.id,
    name: row.name,
    type: row.type as "PERCENTAGE" | "FIXED",
    mode: row.mode as "AUTOMATIC" | "COUPON",
    scope: row.scope as "PRODUCTS" | "CATEGORIES" | "FAMILIES" | "CART",
    // Decimals are serialized at this boundary like every other number
    // leaving the database (see @repo/money).
    rate: row.rate == null ? null : serializeRate(row.rate as never),
    amount: row.amount == null ? null : serializeMoney(row.amount as never),
    code: row.code,
    minOrderValue: row.minOrderValue == null ? null : serializeMoney(row.minOrderValue as never),
    usageLimit: row.usageLimit,
    perCustomerLimit: row.perCustomerLimit,
    usageCount: row.usageCount,
    stackable: row.stackable,
    priority: row.priority,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
    productIds: row.products?.map((p) => p.productId) ?? [],
    categoryIds: row.categories?.map((c) => c.categoryId) ?? [],
    families: (row.families?.map((f) => f.family) ?? []) as ProductFamily[],
  };
}

const DISCOUNT_FOR_PRICING = {
  include: {
    products: { select: { productId: true } },
    categories: { select: { categoryId: true } },
    families: { select: { family: true } },
  },
} as const;

/**
 * Every discount that could apply right now: the automatic ones, plus the
 * one coupon the customer typed. Fetching only what can apply keeps the
 * engine's input small and stops an unrelated coupon appearing in
 * `rejected` for no reason.
 */
export async function discountsForCart(coupon?: string | null, db: Db = prisma) {
  const code = coupon?.trim().toUpperCase() || null;
  const rows = await db.discount.findMany({
    where: {
      isActive: true,
      OR: [{ mode: "AUTOMATIC" }, ...(code ? [{ mode: "COUPON" as const, code }] : [])],
    },
    ...DISCOUNT_FOR_PRICING,
  });
  return rows.map(toPricingRule);
}

/**
 * The Prisma select a product needs before it can be priced, and the
 * conversion into a cart line.
 *
 * One place, so the product page, the checkout and the admin preview build
 * an identical line — a discount that applies in the preview and not at
 * checkout is worse than one that never applied at all.
 */
export function pricedProductSelect() {
  return {
    id: true,
    price: true,
    categoryId: true,
    lightingtypeId: true,
    sectionType: true,
  };
}

export function toCartLine(
  product: {
    id: string;
    price: unknown;
    categoryId: string;
    lightingtypeId: string;
    sectionType: ProductFamily;
  },
  options: { id?: string; quantity?: number; unitPrice?: string } = {},
) {
  return {
    id: options.id ?? product.id,
    productId: product.id,
    // Both the top category and the lighting type: a discount scoped to
    // either should find the line.
    categoryIds: [product.categoryId, product.lightingtypeId],
    // sectionType *is* the family now; there is nothing left to map.
    family: product.sectionType,
    unitPrice: options.unitPrice ?? serializeMoney(product.price as never),
    quantity: options.quantity ?? 1,
  };
}

/**
 * The effective discount rate for each product, as a customer buying one of
 * it would get.
 *
 * The storefront shows "13% off" on a card and a struck-through price on a
 * product page. Those used to read `Product.discount`, a rate on the row —
 * which is why a promotion could not have a date window, a minimum or a
 * scope: the display had nowhere to put them. The number now comes from
 * the same engine that prices the checkout, so a promotion that has not
 * started cannot be advertised.
 *
 * One query for the discounts, then a pure computation per product.
 */
export async function productDiscountRates(
  products: {
    id: string;
    price: unknown;
    categoryId: string;
    lightingtypeId: string;
    sectionType: ProductFamily;
  }[],
  db: Db = prisma,
  now = new Date(),
): Promise<Record<string, string>> {
  if (products.length === 0) return {};

  // Automatic only: a coupon is not a price the storefront may advertise.
  const rules = await discountsForCart(null, db);
  if (rules.length === 0) return {};

  const rates: Record<string, string> = {};
  for (const product of products) {
    const priced = computePricing({ lines: [toCartLine(product)], discounts: rules, now });
    const subtotal = money(priced.subtotal);
    if (subtotal.isZero()) continue;
    const rate = money(priced.discountTotal).dividedBy(subtotal);
    if (rate.greaterThan(0)) rates[product.id] = rate.toFixed(4);
  }
  return rates;
}

/** How many times this customer has already used each discount, on confirmed orders. */
export async function redemptionsByCustomer(
  identity: { userId?: string | null; email?: string | null },
  db: Db = prisma,
): Promise<Record<string, number>> {
  if (!identity.userId && !identity.email) return {};
  const grouped = await db.discountRedemption.groupBy({
    by: ["discountId"],
    // Confirmed orders only: an order the customer walked away from holds
    // its discounts without having used them.
    where: {
      order: { isCompleted: true },
      ...(identity.userId ? { userId: identity.userId } : { customerEmail: identity.email! }),
    },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((row) => [row.discountId, row._count._all]));
}

export class DiscountUnavailableError extends Error {
  constructor(readonly discountId: string, readonly reason: string) {
    super(`Discount ${discountId} is no longer available: ${reason}`);
    this.name = "DiscountUnavailableError";
  }
}

/**
 * Records which discounts an order was priced with, when it is placed.
 *
 * A hold, not a use: it claims nothing and counts towards no limit until
 * the customer confirms (claimOrderDiscounts). Claiming at placement let
 * an order abandoned at the address step burn a use of a limited coupon,
 * and with a per-customer limit of one it locked the customer out of the
 * coupon they never got.
 *
 * Inside the transaction that creates the order, so a hold never outlives
 * an order that failed to save.
 */
export async function holdDiscount(
  tx: Db,
  input: {
    discountId: string;
    orderId: number;
    userId?: string | null;
    customerEmail: string;
    amount: string;
  },
) {
  return tx.discountRedemption.create({
    data: {
      discountId: input.discountId,
      orderId: input.orderId,
      userId: input.userId ?? null,
      customerEmail: input.customerEmail,
      amount: money(input.amount).toFixed(2),
    },
  });
}

/** Why a held discount cannot be claimed now, or null when it can. */
export function claimRefusal(
  discount: { usageLimit: number | null; usageCount: number; perCustomerLimit: number | null; isActive: boolean } | undefined,
  usedByCustomer: number,
): string | null {
  if (!discount) return "it no longer exists";
  if (!discount.isActive) return "it was deactivated";
  if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) return "its usage limit was reached";
  if (discount.perCustomerLimit != null && usedByCustomer >= discount.perCustomerLimit) {
    return "this customer has already used it";
  }
  return null;
}

/**
 * The customer confirms: every discount the order holds claims one of its
 * uses now, or the confirmation fails with DiscountUnavailableError.
 *
 * Each discount row is locked before its count is read, so two
 * confirmations racing for the last use of a coupon cannot both get it —
 * a check-then-increment without the lock is precisely the classic
 * oversell. Rows are locked in id order so two orders holding the same
 * discounts cannot deadlock. Only confirmed orders count towards a
 * per-customer limit.
 *
 * Inside the transaction that marks the order complete: a failure here
 * rolls the confirmation back.
 */
export async function claimOrderDiscounts(tx: Db, orderId: number) {
  const held = await tx.discountRedemption.findMany({
    where: { orderId },
    select: { discountId: true, userId: true, customerEmail: true },
    orderBy: { discountId: "asc" },
  });

  for (const hold of held) {
    const [locked] = await tx.$queryRaw<
      { usageLimit: number | null; usageCount: number; perCustomerLimit: number | null; isActive: boolean }[]
    >`SELECT "usageLimit", "usageCount", "perCustomerLimit", "isActive"
        FROM "discounts" WHERE "id" = ${hold.discountId} FOR UPDATE`;

    const usedByCustomer =
      locked?.perCustomerLimit != null
        ? await tx.discountRedemption.count({
            where: {
              discountId: hold.discountId,
              orderId: { not: orderId },
              order: { isCompleted: true },
              ...(hold.userId ? { userId: hold.userId } : { customerEmail: hold.customerEmail }),
            },
          })
        : 0;

    const refusal = claimRefusal(locked, usedByCustomer);
    if (refusal) throw new DiscountUnavailableError(hold.discountId, refusal);

    await tx.discount.update({
      where: { id: hold.discountId },
      data: { usageCount: { increment: 1 } },
    });
  }
}
