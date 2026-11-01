import "server-only";

import { describeProduct, type DescribableProduct } from "@repo/catalog/describe";
import { formatNumber } from "@/lib/numbers";

/**
 * The spec keys a card's short description reads: the opening clause's
 * wattage plus describeProduct's SHORT_CLAUSES (packages/catalog/src/describe.ts).
 * The catalogue query loads only these items, not every spec of every
 * product. Keep in step with SHORT_CLAUSES if it changes.
 */
export const CARD_SPEC_KEYS = ["maximumWattage", "mainMaterial", "luminousFlux", "beamAngle", "ip"];

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * A card's two-line description, rendered once on the server.
 *
 * The same steps as useProductDescription (lib/use-product-description.ts)
 * with the `product-description` translator handed in, so a card and the
 * product page it links to still say the same thing — without sending
 * every card's spec tree and bulbs to the browser to build one sentence.
 */
export function cardDescription(product: DescribableProduct, t: Translate, locale: string): string {
  const rendered = describeProduct(product, "short")
    .map((clause) => {
      if (!clause.params) return clause;
      // Digits as the locale writes them; the raw number still goes through
      // for the plural category.
      const params: Record<string, string | number> = { ...clause.params };
      for (const [name, value] of Object.entries(clause.params)) {
        if (typeof value === "number") params[`${name}Text`] = formatNumber(value, locale === "ar" ? "ar" : "en");
      }
      // A product whose lighting type never loaded opens with a generic noun, not a blank.
      if ("type" in params && !String(params.type).trim()) params.type = t("fixture");
      return { ...clause, params };
    })
    .map((clause) => t(clause.key, clause.params).trim())
    .filter(Boolean);
  if (rendered.length === 0) return "";
  return rendered.join(t("join")) + t("end");
}
