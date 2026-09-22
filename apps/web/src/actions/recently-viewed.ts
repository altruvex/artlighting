"use server";

import { RECENTLY_VIEWED_MAX } from "@/lib/recently-viewed";
import { cardsByProductIds, type ShopCard } from "@/lib/shop.server";

/**
 * Fresh cards for the codes a browser remembers viewing.
 *
 * The list comes from localStorage, so it is treated as untrusted input:
 * only short strings, only so many, and only active products come back.
 */
export async function recentlyViewedCards(productIds: unknown, locale: unknown): Promise<ShopCard[]> {
  if (!Array.isArray(productIds)) return [];
  const codes = [...new Set(productIds)]
    .filter((code): code is string => typeof code === "string" && code.length > 0 && code.length <= 120)
    .slice(0, RECENTLY_VIEWED_MAX);
  return cardsByProductIds(codes, locale === "ar" ? "ar" : "en");
}
