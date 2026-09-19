import { Decimal } from "decimal.js";

/**
 * Money and rates for the whole monorepo.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **Arithmetic never touches JS numbers.** `0.1 + 0.2` is not `0.3` in
 *    binary floating point, and an e-commerce total that is off by a
 *    thousandth of a pound eventually shows up as an invoice that doesn't
 *    add up. Every sum, discount and tax goes through Decimal.
 * 2. **Values cross boundaries as strings.** `Prisma.Decimal` cannot be
 *    serialized from a Server Component to a Client Component, and neither
 *    Redis nor a JSON response preserves it. `serializeMoney` turns a value
 *    into a fixed-scale string; `money()` parses it back. Converting to
 *    `number` anywhere in between defeats rule 1.
 */
export type MoneyInput = string | number | Decimal | { toString(): string };

/** Money keeps 2 decimals; rates keep 4; exchange rates keep 8. */
export const MONEY_SCALE = 2;
export const RATE_SCALE = 4;
export const EXCHANGE_RATE_SCALE = 8;

/**
 * Half-up, the rounding people expect on a receipt: 2.345 -> 2.35.
 * (Decimal.js defaults to half-up already; set explicitly so a change in the
 * library's defaults can't silently change every price in the system.)
 */
const ROUNDING = Decimal.ROUND_HALF_UP;

/** Parses anything money-shaped into a Decimal, without going through Number. */
export function money(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Not a finite amount: ${value}`);
    // A JS number is only exact up to 2^53; converting via string keeps the
    // digits the caller actually had rather than the binary approximation.
    return new Decimal(value.toString());
  }
  const text = typeof value === "string" ? value : value.toString();
  const parsed = new Decimal(text.trim());
  if (!parsed.isFinite()) throw new TypeError(`Not a finite amount: ${text}`);
  return parsed;
}

export function isValidMoney(value: unknown): boolean {
  try {
    money(value as MoneyInput);
    return true;
  } catch {
    return false;
  }
}

/** Rounds to the money scale (2 decimals, half-up). */
export function roundMoney(value: MoneyInput): Decimal {
  return money(value).toDecimalPlaces(MONEY_SCALE, ROUNDING);
}

export function roundRate(value: MoneyInput, scale: number = RATE_SCALE): Decimal {
  return money(value).toDecimalPlaces(scale, ROUNDING);
}

export function addMoney(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(money(value)), new Decimal(0));
}

export function subtractMoney(from: MoneyInput, ...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.minus(money(value)), money(from));
}

/** Line total: unit price × quantity, rounded once at the end. */
export function multiplyMoney(value: MoneyInput, factor: MoneyInput): Decimal {
  return roundMoney(money(value).times(money(factor)));
}

export function sumMoney(values: MoneyInput[]): Decimal {
  return roundMoney(addMoney(...values));
}

/**
 * Applies a rate expressed as a fraction (0.13 = 13%) and returns the
 * *amount* of the discount/tax, rounded to money scale.
 */
export function applyRate(amount: MoneyInput, rate: MoneyInput): Decimal {
  return roundMoney(money(amount).times(money(rate)));
}

/** Applies a percentage expressed as a number of percent (13 = 13%). */
export function applyPercent(amount: MoneyInput, percent: MoneyInput): Decimal {
  return applyRate(amount, money(percent).dividedBy(100));
}

/** Never below zero — a discount can't turn into a credit. */
export function clampNonNegative(value: MoneyInput): Decimal {
  const amount = money(value);
  return amount.isNegative() ? new Decimal(0) : amount;
}

export function compareMoney(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  return money(a).comparedTo(money(b)) as -1 | 0 | 1;
}

export function isZeroMoney(value: MoneyInput): boolean {
  return money(value).isZero();
}

/**
 * The string form that crosses every boundary: server→client props, JSON
 * responses, the Redis cache, Excel cells.
 */
export function serializeMoney(value: MoneyInput, scale: number = MONEY_SCALE): string {
  return money(value).toFixed(scale, ROUNDING);
}

export function serializeRate(value: MoneyInput, scale: number = RATE_SCALE): string {
  return money(value).toFixed(scale, ROUNDING);
}

/** Display only — the number conversion happens at the very last step. */
export function formatMoney(
  value: MoneyInput,
  { locale = "en", currency = "EGP" }: { locale?: string; currency?: string } = {},
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    serializeMoney(value) as unknown as number,
  );
}

export function formatRateAsPercent(
  value: MoneyInput,
  { locale = "en", maximumFractionDigits = 2 }: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits }).format(
    money(value).toNumber(),
  );
}

export { Decimal };
