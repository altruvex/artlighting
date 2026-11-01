import "server-only";

import { prisma } from "@repo/database";
import { inventorySelect, sellableFrom } from "@repo/catalog";
import { cacheLife } from "next/cache";

/**
 * Tags for the storefront's `"use cache"` entries, in one place so the
 * code that caches and the code that invalidates cannot drift apart.
 *
 * - CATALOGUE: anything built from products, prices, stock, discounts,
 *   bulbs, categories or specs. The admin invalidates it through
 *   /api/revalidate on every catalogue write; an order invalidates it
 *   only when it changes what a card shows (see tagsForOrder).
 * - CARDS: every product card (the shop, the home and application pages,
 *   the rails), on top of CATALOGUE. A review (the stars) and an order that
 *   leaves a product at "few left" drop this instead of every product page.
 * - productTag(code): one product's page record. Orders and reviews drop
 *   this instead of the whole catalogue.
 * - reviewsTag(code): one product's review list and distribution.
 */
export const CATALOGUE_TAG = "catalogue";
export const CARDS_TAG = "cards";
export const productTag = (productCode: string) => `product:${productCode.toLowerCase()}`;
export const reviewsTag = (productCode: string) => `reviews:${productCode.toLowerCase()}`;

/** The stock at or below which a card says "few left" (product-card.tsx and buy-box.tsx LOW_STOCK). */
const CARD_LOW_STOCK = 5;

/**
 * What a confirmed order must invalidate.
 *
 * Each product on it, always: its page shows the exact stock. The cards
 * too when a product is now at or below the "few left" mark (cards show
 * the count from there, and "sold out" at 0). The whole catalogue only
 * when a coupon has used its last use (the promo bar). Above the mark a
 * card shows no stock at all, so the shop and the other ~480 prerendered
 * pages are left alone.
 */
export async function tagsForOrder(orderId: number): Promise<string[]> {
  try {
    const [items, claims] = await Promise.all([
      prisma.orderItem.findMany({
        where: { orderId },
        select: {
          product: {
            select: {
              productId: true,
              trackInventory: true,
              variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
            },
          },
        },
      }),
      prisma.discountRedemption.findMany({
        where: { orderId },
        select: { discount: { select: { usageLimit: true, usageCount: true } } },
      }),
    ]);
    const lowStock = items.some(({ product }) => {
      const left = sellableFrom(product, product.variants[0]?.inventory);
      return left !== null && left <= CARD_LOW_STOCK;
    });
    const couponSpent = claims.some(({ discount }) => discount.usageLimit !== null && discount.usageCount >= discount.usageLimit);
    // A spent coupon changes the promo bar, which only CATALOGUE covers.
    if (couponSpent) return [CATALOGUE_TAG];
    const products = [...new Set(items.map(({ product }) => productTag(product.productId)))];
    return lowStock ? [CARDS_TAG, ...products] : products;
  } catch (error) {
    // The order is placed either way; refreshing too much beats too little.
    console.error("Order cache tags failed:", error);
    return [CATALOGUE_TAG];
  }
}

/** Tags the admin may invalidate over HTTP. Anything else is refused. */
export function isRevalidatableTag(tag: string): boolean {
  return tag === CATALOGUE_TAG || /^reviews:[a-z0-9._-]{1,120}$/.test(tag);
}

/** How long catalogue data is served before it is refreshed in the background. */
const CATALOGUE_REVALIDATE = 3600;

/**
 * cacheLife for anything whose figures depend on the discounts live right
 * now. Normally the "catalogue" profile (1 hour, refreshed on admin
 * writes). When a discount starts or ends sooner than that, the entry
 * expires at that moment instead: a card must not keep advertising a
 * promotion the checkout has already stopped applying.
 *
 * Must be called inside a `"use cache"` scope.
 */
export async function catalogueCacheLife(now = new Date()): Promise<void> {
  const upcoming = await prisma.discount.findMany({
    where: { isActive: true, OR: [{ startsAt: { gt: now } }, { endsAt: { gt: now } }] },
    select: { startsAt: true, endsAt: true },
  });

  let next = Infinity;
  for (const { startsAt, endsAt } of upcoming) {
    for (const at of [startsAt, endsAt]) {
      if (at && at > now) next = Math.min(next, at.getTime() - now.getTime());
    }
  }

  const seconds = Math.ceil(next / 1000);
  if (seconds >= CATALOGUE_REVALIDATE) {
    cacheLife("catalogue");
    return;
  }
  const revalidate = Math.max(1, seconds);
  cacheLife({ stale: Math.min(30, revalidate), revalidate, expire: Math.max(revalidate, 3600) });
}
