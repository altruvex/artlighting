import "server-only";

import { prisma } from "@repo/database";
import { productFamilies, type ProductFamily } from "@repo/catalog/families";
import { serializeMoney, serializeRate } from "@repo/money";
import { cacheTag } from "next/cache";
import { CATALOGUE_TAG, catalogueCacheLife } from "@/lib/cache.server";

/**
 * What the storefront advertises, read from the Discount rows that are live.
 *
 * The banner this replaces said "خصم يصل إلى ٣٠٪ على جميع منتجات النجف" from a
 * string in the message file. It matched the data by coincidence: change the
 * chandelier discount to 25% in the admin and the banner kept promising 30,
 * and a promotion added there never reached the site at all. Everything here
 * comes from the rows the checkout prices with, so the banner cannot offer
 * what the cart will not give.
 */

export interface Promotion {
  id: string;
  /** A rate (0.3 = 30%) or a fixed amount — exactly one, as serialized money. */
  rate: string | null;
  amount: string | null;
  /**
   * What it applies to, in terms the shopper recognises. A discount scoped to
   * exactly the products of one family is described as that family: the
   * migrated 30% covers all 56 chandeliers, and "on every chandelier" is
   * truer and shorter than "on 56 products".
   */
  coverage:
    | { kind: "family"; family: ProductFamily }
    | { kind: "families"; families: ProductFamily[] }
    | { kind: "products"; count: number }
    | { kind: "categories"; count: number }
    | { kind: "cart"; minOrderValue: string | null };
  /** ISO. Present only when the promotion actually ends. */
  endsAt: string | null;
  /** A code shoppers must enter. Advertised, because an unknown code is no offer. */
  code: string | null;
}

/**
 * Cached: the promo bar sits in the layout of every page, and this was two
 * queries — one of them the whole product table — on each of them. It
 * expires the moment a promotion starts or ends (catalogueCacheLife), and
 * the admin drops it on any discount or product write.
 */
export async function activePromotions(): Promise<Promotion[]> {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  const now = new Date();
  await catalogueCacheLife(now);
  const rows = await prisma.discount.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    select: {
      id: true,
      type: true,
      scope: true,
      rate: true,
      amount: true,
      code: true,
      endsAt: true,
      minOrderValue: true,
      usageLimit: true,
      usageCount: true,
      families: { select: { family: true } },
      products: { select: { productId: true } },
      _count: { select: { categories: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Which family a set of products is exactly — computed once, from the
  // live catalogue, not assumed from a name like "30% off chandeliers".
  const byFamily = new Map<ProductFamily, Set<string>>();
  for (const family of productFamilies) byFamily.set(family, new Set());
  const catalogue = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sectionType: true },
  });
  for (const product of catalogue) byFamily.get(product.sectionType)?.add(product.id);

  // The smallest set of whole families whose products are exactly these.
  // Not only one family: the migrated 13% covers indoor *and* outdoor — all
  // 61 spotlights — and a single-family check would have called it "61
  // products". Three families means seven subsets; checking them all is
  // cheaper than being clever.
  const exactFamilies = (ids: string[]): ProductFamily[] | null => {
    const set = new Set(ids);
    const families = [...byFamily.keys()];
    let best: ProductFamily[] | null = null;
    for (let mask = 1; mask < 1 << families.length; mask++) {
      const chosen = families.filter((_, index) => mask & (1 << index));
      const union = new Set(chosen.flatMap((family) => [...byFamily.get(family)!]));
      if (union.size === set.size && [...union].every((id) => set.has(id))) {
        if (!best || chosen.length < best.length) best = chosen;
      }
    }
    return best;
  };

  return rows
    // A promotion that has used up its redemptions is not on offer, whatever
    // its active flag says.
    .filter((row) => row.usageLimit == null || row.usageCount < row.usageLimit)
    .map((row): Promotion => {
      let coverage: Promotion["coverage"];
      if (row.scope === "FAMILIES") {
        const families = row.families.map((entry) => entry.family as ProductFamily);
        coverage = families.length === 1 ? { kind: "family", family: families[0]! } : { kind: "families", families };
      } else if (row.scope === "PRODUCTS") {
        const ids = row.products.map((entry) => entry.productId);
        const families = exactFamilies(ids);
        coverage = !families
          ? { kind: "products", count: ids.length }
          : families.length === 1
            ? { kind: "family", family: families[0]! }
            : { kind: "families", families };
      } else if (row.scope === "CATEGORIES") {
        coverage = { kind: "categories", count: row._count.categories };
      } else {
        coverage = {
          kind: "cart",
          minOrderValue: row.minOrderValue == null ? null : serializeMoney(row.minOrderValue),
        };
      }
      return {
        id: row.id,
        rate: row.type === "PERCENTAGE" && row.rate != null ? serializeRate(row.rate) : null,
        amount: row.type === "FIXED" && row.amount != null ? serializeMoney(row.amount) : null,
        coverage,
        endsAt: row.endsAt ? row.endsAt.toISOString() : null,
        code: row.code,
      };
    });
}

/**
 * Strongest first: the largest rate, then the soonest to end — a deadline is
 * what makes a shopper act, so between two equal offers the one running out
 * leads. Order matters because a phone shows only the first; left in the
 * order the rows were created, the 13% sat in front of the 30%.
 */
export function byStrength(promotions: Promotion[]): Promotion[] {
  return [...promotions].sort((a, b) => {
    const rateDelta = Number(b.rate ?? 0) - Number(a.rate ?? 0);
    if (rateDelta !== 0) return rateDelta;
    if (a.endsAt && b.endsAt) return a.endsAt.localeCompare(b.endsAt);
    return a.endsAt ? -1 : b.endsAt ? 1 : 0;
  });
}
