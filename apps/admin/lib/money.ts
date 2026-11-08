import { isValidMoney, money, serializeRate, type MoneyInput } from "@repo/money";

export { formatMoney, formatRateAsPercent, type MoneyInput } from "@repo/money";

/**
 * The admin types percents ("12.5"); the engine and the database take rates
 * ("0.1250"). Both directions go through Decimal: `Number("0.07") * 100` is
 * 7.000000000000001, which is what the form used to show.
 */

/** "0.1250" -> "12.5"; "0.0700" -> "7". Empty for a missing or unparsable rate. */
export function rateToPercent(rate: MoneyInput | null | undefined): string {
  return rate != null && isValidMoney(rate) ? money(rate).times(100).toDecimalPlaces(2).toString() : "";
}

/** "12.5" -> "0.1250". Null when the text is not a number. */
export function percentToRate(percent: string): string | null {
  const trimmed = percent.trim();
  return trimmed !== "" && isValidMoney(trimmed) ? serializeRate(money(trimmed).dividedBy(100)) : null;
}

/**
 * Sort key for a money or rate column.
 *
 * Money crosses the Server → Client boundary as a string (Prisma.Decimal
 * cannot be serialized), and a table that sorts those strings puts "9" above
 * "10". Columns therefore sort on this number and format from the string, so
 * the displayed amount keeps every digit the Decimal column stores.
 */
export function moneySortKey(value: MoneyInput): number {
  return money(value).toNumber();
}
