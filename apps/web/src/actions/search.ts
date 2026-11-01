"use server";

import { familiesMatching } from "@repo/catalog";
import { catalogueCards } from "@/lib/shop.server";

/**
 * The header's search-as-you-type.
 *
 * Filters the cached catalogue in memory rather than querying on every
 * keystroke (the field fires one call per pause in typing, per visitor).
 * It also means a result is always an active product, priced and
 * described exactly as its card is: the query this replaced had no
 * isActive filter, so retired products turned up in search.
 */
export async function searchProducts(searchItem: string, locale = "en") {
  const needle = searchItem.trim().toLocaleLowerCase(locale).slice(0, 80);
  if (!needle) return [];
  // sectionType is matched against whole families whose slug contains the
  // term, as before.
  const families = new Set<string>(familiesMatching(needle));

  const cards = await catalogueCards(locale === "ar" ? "ar" : "en");
  return cards
    .filter(
      (card) =>
        card.productName.toLocaleLowerCase(locale).includes(needle) ||
        card.productId.toLowerCase().includes(needle) ||
        card.brand.toLowerCase().includes(needle) ||
        // The lighting type in this locale — what the shop's own search
        // matches too, and the only Arabic word most products carry.
        (card.lightingTypeName ?? "").toLocaleLowerCase(locale).includes(needle) ||
        families.has(card.sectionType),
    )
    .slice(0, 10);
}
