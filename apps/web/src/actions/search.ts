"use server";

import { familiesMatching } from "@repo/catalog";
import { catalogueCards, type ShopCard } from "@/lib/shop.server";
import { MIN_SEARCH_LENGTH, SEARCH_SHOWN } from "./search-limits";

/**
 * The header's search-as-you-type.
 *
 * Filters the cached catalogue in memory rather than querying on every
 * keystroke (the field fires one call per pause in typing, per visitor).
 * It also means a result is always an active product, priced and
 * described exactly as its card is: the query this replaced had no
 * isActive filter, so retired products turned up in search.
 */
/** What one dropdown row renders — not the whole card. */
export interface SearchHit {
  productId: string;
  productName: string;
  brand: string;
  /** Serialized money (see @repo/money). */
  price: string;
  discount: string;
  image: string | null;
  sectionType: ShopCard["sectionType"];
  spotlightType: string;
}

export async function searchProducts(
  searchItem: string,
  locale = "en",
): Promise<{ hits: SearchHit[]; total: number }> {
  if (typeof searchItem !== "string") return { hits: [], total: 0 };
  const needle = searchItem.trim().toLocaleLowerCase(locale).slice(0, 80);
  if (needle.length < MIN_SEARCH_LENGTH) return { hits: [], total: 0 };
  // sectionType is matched against whole families whose slug contains the
  // term, as before.
  const families = new Set<string>(familiesMatching(needle));

  const cards = await catalogueCards(locale === "ar" ? "ar" : "en");
  const matched = cards.filter(
    (card) =>
      card.productName.toLocaleLowerCase(locale).includes(needle) ||
      card.productId.toLowerCase().includes(needle) ||
      card.brand.toLowerCase().includes(needle) ||
      // The lighting type in this locale — what the shop's own search
      // matches too, and the only Arabic word most products carry.
      (card.lightingTypeName ?? "").toLocaleLowerCase(locale).includes(needle) ||
      families.has(card.sectionType),
  );
  return {
    hits: matched.slice(0, SEARCH_SHOWN).map((card) => ({
      productId: card.productId,
      productName: card.productName,
      brand: card.brand,
      price: card.price,
      discount: card.discount,
      image: card.productImages[0] ?? null,
      sectionType: card.sectionType,
      spotlightType: card.spotlightType,
    })),
    // The real number of matches, for "view all".
    total: matched.length,
  };
}
