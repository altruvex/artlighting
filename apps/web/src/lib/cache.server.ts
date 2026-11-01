import "server-only";

import { prisma } from "@repo/database";
import { cacheLife } from "next/cache";

/**
 * Tags for the storefront's `"use cache"` entries, in one place so the
 * code that caches and the code that invalidates cannot drift apart.
 *
 * - CATALOGUE: anything built from products, prices, stock, discounts,
 *   bulbs, categories or specs. The admin invalidates it through
 *   /api/revalidate on every catalogue write; an order invalidates it
 *   because it moves stock.
 * - reviewsTag(code): one product's review list and distribution.
 */
export const CATALOGUE_TAG = "catalogue";
export const reviewsTag = (productCode: string) => `reviews:${productCode.toLowerCase()}`;

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
