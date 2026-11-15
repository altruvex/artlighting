import { familySlug, productFamilies } from "@repo/catalog/families";
import { LIGHTING_TYPES } from "@/content/lighting-types";

/** The finite set of shop pages worth indexing, also published in the sitemap. */
export const SHOP_LANDING_PATHS = [
  "/products",
  ...productFamilies.map((family) => `/products?family=${familySlug(family)}`),
  ...LIGHTING_TYPES.map((type) => `/products?family=${familySlug(type.family)}&type=${type.id}`),
];

const landingPaths = new Set(SHOP_LANDING_PATHS);

/** Other combinations still work for shoppers, but must not grow the crawl graph. */
export function shopLinkRel(href: string): "nofollow" | undefined {
  return landingPaths.has(href) ? undefined : "nofollow";
}
