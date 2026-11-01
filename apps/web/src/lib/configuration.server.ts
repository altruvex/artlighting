import "server-only";

import { prisma } from "@repo/database";
import { toViewConfiguration } from "@/lib/serialize-money";

/**
 * The visitor's saved configuration for a product, if they have one —
 * read only.
 *
 * The product page used to call getOrCreateConfiguration while rendering,
 * so every first visit to every product wrote a row: a crawler or a burst
 * of traffic turned page views into inserts. The row is now created when
 * the customer first chooses something (actions/configuration.ts); a page
 * view only looks one up, and a visitor with no identity at all skips even
 * that.
 */
export async function findConfiguration(productCode: string, userId: string | null, guestToken: string | null) {
  if (!userId && !guestToken) return null;
  const row = await prisma.configuration.findFirst({
    where: userId
      ? { productId: productCode, userId }
      : { productId: productCode, userId: null, guestToken },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toViewConfiguration(row) : null;
}
