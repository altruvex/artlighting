import { money, multiplyMoney, serializeMoney } from "@repo/money";

/**
 * What a bulb costs on a given fixture — the arithmetic, with no database.
 *
 * Its own module for the same reason families has one: the storefront and
 * the admin do this sum in Client Components, and importing it from the
 * package barrel drags Prisma into the browser bundle. That is not a
 * warning, it is a build failure — "the chunking context does not support
 * external modules (request: node:module)" — and it has now happened twice.
 */

export const bulbBases = ["E27", "E14"] as const;
export type BulbBase = (typeof bulbBases)[number];

export type BulbRow = {
  id: string;
  key: string;
  wattage: number;
  base: BulbBase;
  price: unknown;
  isActive: boolean;
  position: number;
  translations: { language: string; name: string }[];
};

export interface BulbChoice {
  id: string;
  key: string;
  wattage: number;
  base: BulbBase;
  /** Per bulb, serialized (see @repo/money): never a float. */
  price: string;
  /**
   * What choosing this one adds to the fixture: the difference from the
   * bulb it is sold with, times the arms. Zero for the default, because the
   * listed price already covers it.
   */
  increase: string;
  /** The shape in this locale; the wattage is rendered beside it. */
  name: string;
  isDefault: boolean;
}

/**
 * What a product offers, priced for its arm count and named for one locale.
 *
 * Returns nothing for a fixture with no arms, which is the rule Ali set:
 * the choice appears only where a bulb actually goes.
 */
export function bulbChoices(
  rows: { isDefault: boolean; bulb: BulbRow }[] | null | undefined,
  hNumber: number | null | undefined,
  language: string,
): BulbChoice[] {
  const arms = hNumber ?? 0;
  if (arms <= 0) return [];
  const offered = (rows ?? []).filter((row) => row.bulb.isActive);
  // The price the fixture already covers. If the default has been retired,
  // the cheapest one still offered stands in, so no choice silently becomes
  // an upgrade over a bulb nobody can buy.
  const included =
    offered.find((row) => row.isDefault)?.bulb.price ??
    offered
      .map((row) => row.bulb.price as never)
      .sort((a, b) => money(a).comparedTo(money(b)))[0] ??
    0;

  return offered.map((row) => ({
    id: row.bulb.id,
    key: row.bulb.key,
    wattage: row.bulb.wattage,
    base: row.bulb.base,
    price: serializeMoney(row.bulb.price as never),
    increase: bulbPriceIncrease(row.bulb.price, included, arms),
    name:
      row.bulb.translations.find((t) => t.language === language)?.name ??
      row.bulb.translations.find((t) => t.language === "en")?.name ??
      row.bulb.key,
    isDefault: row.isDefault,
  }));
}

/**
 * What choosing a bulb adds to a fixture.
 *
 * The listed price includes the bulb the fixture is sold with, so this is
 * the difference from that one, times the arms — zero for the default
 * itself. A cheaper bulb genuinely takes money off rather than being
 * quietly rounded up to nothing: hiding that would mean charging for a
 * fitting the customer did not choose.
 */
export function bulbPriceIncrease(
  pricePerBulb: unknown,
  includedPricePerBulb: unknown,
  hNumber: number | null | undefined,
): string {
  const arms = hNumber ?? 0;
  if (arms <= 0) return serializeMoney(0);
  const difference = money(pricePerBulb as never).minus(money(includedPricePerBulb as never));
  return serializeMoney(multiplyMoney(difference, arms));
}
