import { money, type MoneyInput } from "@repo/money";

export { formatMoney, formatRateAsPercent, type MoneyInput } from "@repo/money";

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
