import { serializeMoney, serializeRate } from "@repo/money";

/**
 * Turns the Decimal money/rate fields of a database row into the strings the
 * view models (src/types/products.ts) and client components expect.
 *
 * Prisma returns Decimal objects; passing one to a Client Component throws
 * ("Only plain objects can be passed"), and converting to Number loses the
 * exactness the Decimal column exists to guarantee. Server code calls one of
 * these at the boundary.
 */
const MONEY_FIELDS = [
  "price",
  "priceIncrease",
  "lampPriceIncrease",
  "shippingPrice",
  "configPrice",
  "totalPrice",
  "productPrice",
  "discountedPrice",
  "priceOverride",
  "oldPrice",
  "newPrice",
] as const;

const RATE_FIELDS = ["discount", "discountRate"] as const;

type MoneyField = (typeof MONEY_FIELDS)[number] | (typeof RATE_FIELDS)[number];

/**
 * The row as the client sees it: every money/rate field becomes a string,
 * `null`/`undefined` are preserved, everything else is untouched.
 */
export type SerializedRow<T> = {
  [K in keyof T]: K extends MoneyField ? Extract<T[K], null | undefined> | string : T[K];
};

type Decimalish = { toFixed: (places: number) => string };

function isDecimalish(value: unknown): value is Decimalish {
  return typeof value === "object" && value !== null && typeof (value as Decimalish).toFixed === "function";
}

/**
 * Shallow-serializes the known money and rate fields of one row. Relations
 * are left alone: callers serialize those explicitly, so nothing is
 * converted by accident.
 */
export function serializeRowMoney<T extends Record<string, unknown>>(row: T): SerializedRow<T> {
  const out: Record<string, unknown> = { ...row };
  for (const field of MONEY_FIELDS) {
    const value = out[field];
    if (isDecimalish(value)) out[field] = serializeMoney(value as never);
  }
  for (const field of RATE_FIELDS) {
    const value = out[field];
    if (isDecimalish(value)) out[field] = serializeRate(value as never);
  }
  return out as SerializedRow<T>;
}
