import type { ProductFamily as PricingFamily } from "@repo/pricing";

/**
 * The three shelves the catalogue is divided into.
 *
 * This is a product fact, not a discount one, and it lives on its own so
 * that the schemas (which validate a family) and the discount rules (which
 * can target one) can both reach it without importing each other.
 */
export const productFamilies = ["INDOOR", "OUTDOOR", "CHANDELIER"] as const;
export type ProductFamily = (typeof productFamilies)[number];

/**
 * The URL segment for each family, and back.
 *
 * `Product.sectionType` is the ProductFamily enum now, so the database
 * value and the URL segment are deliberately different strings. They used
 * to be the same one, which is exactly what hid the fact that there was no
 * boundary between a stored value and a route: every page simply passed
 * the URL straight into a `where`. Now the parse either succeeds or the
 * route 404s, instead of querying for a value that cannot exist.
 *
 * The slugs are the live URLs, so they are fixed: /category/balcom/indoor
 * must keep working.
 */
export const FAMILY_SLUGS: Record<ProductFamily, string> = {
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  CHANDELIER: "chandelier",
};

export function familySlug(family: ProductFamily): string {
  return FAMILY_SLUGS[family];
}

/** Null for anything that is not one of the three — a 404, not a guess. */
export function familyFromSlug(slug: string | null | undefined): ProductFamily | null {
  const value = (slug ?? "").trim().toLowerCase();
  const match = (Object.keys(FAMILY_SLUGS) as ProductFamily[]).find(
    (family) => FAMILY_SLUGS[family] === value,
  );
  return match ?? null;
}

/**
 * The families a free-text search term could mean. `sectionType` is an enum,
 * so it cannot be matched with `contains`; typing "chand" still has to reach
 * the chandeliers, so the substring match happens here, over the slugs, and
 * the query gets exact enum values.
 */
export function familiesMatching(term: string | null | undefined): ProductFamily[] {
  const value = (term ?? "").trim().toLowerCase();
  if (!value) return [];
  return (Object.keys(FAMILY_SLUGS) as ProductFamily[]).filter((family) =>
    FAMILY_SLUGS[family].includes(value),
  );
}

/**
 * @repo/pricing is pure and has no dependency on this package, so it spells
 * the same three families out itself. This line is the only thing keeping
 * the two lists honest: adding a family in one place and not the other is
 * a compile error, not a rule that silently stops matching.
 */
type Assert<T extends true> = T;
type _FamiliesAgreeWithPricingEngine = [
  Assert<ProductFamily extends PricingFamily ? true : false>,
  Assert<PricingFamily extends ProductFamily ? true : false>,
];
