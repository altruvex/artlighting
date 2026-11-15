import "server-only";

import { diverseProducts } from "./home-assortment";
import { lightingType } from "@/content/lighting-types";
import { pick } from "@/content/l10n";

import { prisma } from "@repo/database";
import {
  sellableFrom,
  inventorySelect,
  productBulbSelect,
  productDiscountRates,
  type ProductFamily,
} from "@repo/catalog";
import { bulbChoices } from "@repo/catalog/bulb-pricing";
import {
  applyRate,
  money,
  serializeMoney,
  serializeRate,
  subtractMoney,
} from "@repo/money";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import {
  localizeSpecGroups,
  specGroupSelect,
  specsByKey,
} from "@/lib/spec-groups";
import { CARD_SPEC_KEYS, cardDescription } from "@/lib/card-description";
import {
  CARDS_TAG,
  CATALOGUE_TAG,
  catalogueCacheLife,
} from "@/lib/cache.server";
import { cacheTag } from "next/cache";
import { getTranslations } from "next-intl/server";

/**
 * The shop: every active product, filtered, faceted and sorted.
 *
 * The storefront had no page like this. A shopper reached a product only
 * down a four-level funnel — brand, family, lighting type, product — with
 * no way to see all chandeliers, everything on sale, or everything under a
 * price, and no way to sort anything.
 *
 * Filtering and faceting happen in memory over one query. At 118 products
 * that is the simple and fast choice; past a few thousand the facets should
 * move into SQL. The card shape is built here once, so this page, the home
 * page and anything after them render the same product the same way.
 *
 * That one query is cached (see catalogueCards): every listing below reads
 * the same in-memory array instead of loading the whole catalogue, with
 * every relation, once per request.
 */

import { isCacheableShopQuery, type ShopQuery } from "./shop-query";
export { parseShopQuery, type ShopQuery, type ShopSort } from "./shop-query";

/**
 * Only what a card, the facets and the sorts read. It used to `include`
 * every Product column (cost price and all), the whole lighting-type row,
 * every image and every spec of every product — ~120 times — when a card
 * shows two images and a one-line description built from five specs.
 */
function cardSelect(locale: string) {
  const specs = specGroupSelect(locale);
  const cardSpecs = { key: { in: CARD_SPEC_KEYS } };
  return {
    id: true,
    productId: true,
    productName: true,
    brand: true,
    price: true,
    sectionType: true,
    spotlightType: true,
    hNumber: true,
    ratingAverage: true,
    ratingCount: true,
    featured: true,
    createdAt: true,
    trackInventory: true,
    madeToOrder: true,
    // productDiscountRates scopes discounts by these.
    categoryId: true,
    lightingtypeId: true,
    translations: {
      where: { language: locale },
      select: { name: true },
      take: 1,
    },
    // The photo and the one that fades in on hover.
    images: { ...productImageSelect(), take: 2 },
    variants: {
      where: { isDefault: true },
      orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
      select: { inventory: inventorySelect() },
      take: 1,
    },
    specGroups: {
      ...specs,
      where: { items: { some: cardSpecs } },
      select: {
        ...specs.select,
        items: { ...specs.select.items, where: cardSpecs },
      },
    },
    bulbs: productBulbSelect(),
    lightingtype: {
      select: {
        name: true,
        translations: {
          where: { language: locale },
          select: { name: true },
          take: 1,
        },
      },
    },
  };
}

type CardRow = Awaited<ReturnType<typeof loadCardRows>>[number];
type DescriptionTranslator = Parameters<typeof cardDescription>[1];

async function loadCardRows(locale: string) {
  return prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    select: cardSelect(locale),
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Every active product as a card, in the admin's order (featured, then
 * newest) — cached per locale.
 *
 * Before this, the home page, the shop (on every filter, sort and page
 * change), each application page, each product page's related rail and
 * the recently-viewed rail each loaded the whole catalogue with all its
 * relations, plus the live discounts, on every request. Under 50
 * concurrent visitors that was ~2 pages a second at ~20 s each. Now it
 * is one query per locale per cache lifetime; the admin and the checkout
 * drop it early through the CATALOGUE tag.
 *
 * Remote, not in-memory: a plain "use cache" entry lives in one serverless
 * instance, so every new instance reloaded the whole catalogue. Under a
 * crawler burst (GPTBot, Nov 2026) that was thousands of full loads and
 * the database's monthly transfer allowance in hours. The remote entry is
 * shared by every instance (Vercel's runtime cache; self-hosted, the
 * handler in next.config.ts).
 */
export async function catalogueCards(locale: string): Promise<ShopCard[]> {
  "use cache: remote";
  cacheTag(CATALOGUE_TAG, CARDS_TAG);
  await catalogueCacheLife();
  const [rows, t] = await Promise.all([
    loadCardRows(locale),
    getTranslations({ locale, namespace: "product-description" }),
  ]);
  const rates = await productDiscountRates(rows, prisma);
  // The keys are built at run time (`opening.${family}`), so the typed translator is widened here.
  const describe = t as unknown as DescriptionTranslator;
  return rows.map((row) =>
    toCard(row, locale, rates[row.id] ?? serializeRate(0), describe),
  );
}

/** One product as every card renders it — no spec tree, no bulbs: the description is built here. */
function toCard(
  row: CardRow,
  locale: string,
  rate: string,
  t: DescriptionTranslator,
) {
  const translation = row.translations?.[0];
  // What the shopper actually pays — the figure a price sort must use, or a
  // 30%-off chandelier sorts as though it cost its list price.
  const effective = subtractMoney(row.price, applyRate(row.price, rate));
  const typeCopy = lightingType(row.spotlightType);
  const lightingTypeName = typeCopy
    ? pick(typeCopy.name, locale)
    : (row.lightingtype?.translations?.[0]?.name ??
      row.lightingtype?.name ??
      undefined);
  return {
    id: row.id,
    productId: row.productId,
    productName: translation?.name || row.productName,
    brand: row.brand,
    price: serializeMoney(row.price),
    effectivePrice: serializeMoney(effective),
    productImages: imageUrls(row),
    sectionType: row.sectionType,
    spotlightType: row.spotlightType,
    discount: rate,
    // null: not tracked, never sold out — see sellableFrom.
    quantity: sellableFrom(row, row.variants[0]?.inventory),
    // Priced by specification and quantity: the card shows "price on request", no quick add.
    madeToOrder: row.madeToOrder,
    ratingAverage:
      row.ratingAverage !== null && row.ratingAverage !== undefined
        ? Number(row.ratingAverage)
        : null,
    ratingCount: row.ratingCount,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
    lightingTypeName,
    lightingTypeSlug: row.spotlightType,
    // The same generator the product page uses, so the two cannot disagree.
    description: cardDescription(
      {
        family: row.sectionType,
        lightingTypeName,
        hNumber: row.hNumber,
        bulbChoices: bulbChoices(row.bulbs, row.hNumber, locale),
        specs: specsByKey(localizeSpecGroups(row.specGroups ?? [], locale)),
      },
      t,
      locale,
    ),
  };
}

export type ShopCard = ReturnType<typeof toCard>;

export interface Facet {
  value: string;
  label: string;
  count: number;
}

/** How many cards a shop page shows before it asks for the next one. */
export const PER_PAGE = 24;

export interface ShopResult {
  /** This page of results, not the whole match. */
  products: ShopCard[];
  total: number;
  page: number;
  pageCount: number;
  /** Across the whole catalogue, so the price slider never narrows itself. */
  priceBounds: { min: number; max: number };
  facets: { family: Facet[]; brand: Facet[]; type: Facet[]; sale: number };
}

/** One page of the shop for a query. */
export async function searchShop(
  query: ShopQuery,
  locale: string,
): Promise<ShopResult> {
  if (!isCacheableShopQuery(query))
    return shopPage(await catalogueCards(locale), query, locale);
  return cachedShop(query, locale);
}

/**
 * Cached per (query, locale): filtering, faceting and sorting ~120 cards is
 * cheap once, but not on every request of every visitor paging through the
 * same shelf.
 */
async function cachedShop(
  query: ShopQuery,
  locale: string,
): Promise<ShopResult> {
  "use cache";
  cacheTag(CATALOGUE_TAG, CARDS_TAG);
  return shopPage(await catalogueCards(locale), query, locale);
}

/**
 * How directly a card can be bought: 0 = price shown and in stock, 1 = made
 * to order (price on request, a quote), 2 = sold out. Every "best first"
 * order puts the lower tier first, so a shopper meets prices and an add-to-bag
 * button before quote-only or unavailable products. Array sort is stable, so
 * within a tier the existing order (featured, then newest) is kept.
 */
function buyTier(card: ShopCard): number {
  if (card.quantity === 0) return 2;
  return card.madeToOrder ? 1 : 0;
}

function shopPage(
  all: ShopCard[],
  query: ShopQuery,
  locale: string,
): ShopResult {
  const needle = query.q.toLocaleLowerCase(locale);
  const priceOf = (card: ShopCard) => Number(card.effectivePrice);

  // Each test is named so a facet can ask "everything but me".
  const tests = {
    family: (c: ShopCard) =>
      query.families.length === 0 ||
      query.families.includes(c.sectionType as ProductFamily),
    brand: (c: ShopCard) =>
      query.brands.length === 0 || query.brands.includes(c.brand),
    type: (c: ShopCard) =>
      query.types.length === 0 || query.types.includes(c.lightingTypeSlug),
    sale: (c: ShopCard) => !query.onSale || money(c.discount).greaterThan(0),
    price: (c: ShopCard) =>
      (query.priceMin === null || priceOf(c) >= query.priceMin) &&
      (query.priceMax === null || priceOf(c) <= query.priceMax),
    text: (c: ShopCard) =>
      !needle ||
      c.productName.toLocaleLowerCase(locale).includes(needle) ||
      c.productId.toLowerCase().includes(needle) ||
      (c.lightingTypeName ?? "").toLocaleLowerCase(locale).includes(needle),
  } as const;
  type TestName = keyof typeof tests;
  const passes = (card: ShopCard, except?: TestName) =>
    (Object.keys(tests) as TestName[]).every(
      (name) => name === except || tests[name](card),
    );

  const matched = all.filter((card) => passes(card));

  // A facet's counts ignore its own selection, so ticking "chandelier" does
  // not make "indoor" read 0 — the standard reading, and the useful one.
  const tally = (
    except: TestName,
    key: (c: ShopCard) => string,
    label: (c: ShopCard) => string,
  ) => {
    const seen = new Map<string, Facet>();
    for (const card of all) {
      if (!passes(card, except)) continue;
      const value = key(card);
      const entry = seen.get(value) ?? { value, label: label(card), count: 0 };
      entry.count++;
      seen.set(value, entry);
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  };

  const sorted = [...matched].sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return priceOf(a) - priceOf(b);
      case "price-desc":
        return priceOf(b) - priceOf(a);
      case "discount":
        return Number(b.discount) - Number(a.discount);
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      default:
        // Buyable before quote-only and sold out, then the admin's featured
        // flag; the query already ordered the rest.
        return (
          buyTier(a) - buyTier(b) || Number(b.featured) - Number(a.featured)
        );
    }
  });

  const prices = all.map(priceOf);
  // 117 cards in one response is 117 images the browser has to lay out
  // before the first of them is useful. The page is part of the URL, so a
  // crawler and the back button both follow it.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(query.page, pageCount);
  return {
    products: sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: sorted.length,
    page,
    pageCount,
    // Not Math.min(...prices, 0): the 0 was meant to guard an empty list and
    // instead made the lower bound 0 every time.
    priceBounds: prices.length
      ? {
          min: Math.floor(Math.min(...prices)),
          max: Math.ceil(Math.max(...prices)),
        }
      : { min: 0, max: 0 },
    facets: {
      family: tally(
        "family",
        (c) => c.sectionType,
        (c) => c.sectionType,
      ),
      brand: tally(
        "brand",
        (c) => c.brand,
        (c) => c.brand,
      ),
      type: tally(
        "type",
        (c) => c.lightingTypeSlug,
        (c) => c.lightingTypeName ?? c.lightingTypeSlug,
      ),
      sale: all.filter(
        (card) => passes(card, "sale") && money(card.discount).greaterThan(0),
      ).length,
    },
  };
}

export interface HomeData {
  types: {
    id: string;
    family: ProductFamily;
    name: string;
    count: number;
    image: string;
  }[];
  families: { family: ProductFamily; count: number }[];
  /** Biggest saving first — the discount the shopper keeps, not the rate. */
  onSale: ShopCard[];
  /** A varied shelf, respecting the admin's preference within each type. */
  featured: ShopCard[];
  newest: ShopCard[];
}

/**
 * Everything the home page sells, from the same rows the shop reads.
 *
 * Its "bestsellers" section was a hard-coded array of product ids in the
 * component: change what is featured in the admin and the home page did
 * not move, and a retired product would have stayed on it. These rails
 * come from the data — the featured flag, the live discounts, the newest
 * rows — so the page changes when the catalogue does.
 */
export async function homeData(
  locale: string,
  perRail = 10,
): Promise<HomeData> {
  const all = await catalogueCards(locale);

  const saving = (card: ShopCard) =>
    Number(card.price) - Number(card.effectivePrice);
  const inStock = (card: ShopCard) => card.quantity !== 0;

  const counts = new Map<ProductFamily, number>();
  for (const card of all)
    counts.set(
      card.sectionType as ProductFamily,
      (counts.get(card.sectionType as ProductFamily) ?? 0) + 1,
    );

  // Keep availability order within each type; rotate families so a recent
  // import of one collection cannot occupy the whole home page.
  const ranked = [...all].sort(
    (a, b) =>
      buyTier(a) - buyTier(b) || Number(b.featured) - Number(a.featured),
  );
  const typeGroups = new Map<string, HomeData["types"][number]>();
  for (const card of ranked) {
    const key = `${card.sectionType}:${card.lightingTypeSlug}`;
    const entry = typeGroups.get(key);
    if (entry) entry.count++;
    else
      typeGroups.set(key, {
        id: card.lightingTypeSlug,
        family: card.sectionType,
        name: card.lightingTypeName ?? card.lightingTypeSlug,
        count: 1,
        image: card.productImages[0] ?? "/placeholder.svg",
      });
  }
  const onSale = all
    .filter((card) => !card.madeToOrder && inStock(card) && saving(card) > 0)
    .sort((a, b) => saving(b) - saving(a))
    .slice(0, perRail);
  const saleIds = new Set(onSale.map((card) => card.id));
  const featured = diverseProducts(
    ranked.filter((card) => !saleIds.has(card.id)),
    perRail,
  );
  const shownIds = new Set([...onSale, ...featured].map((card) => card.id));
  return {
    types: [...typeGroups.values()],
    families: [...counts.entries()].map(([family, count]) => ({
      family,
      count,
    })),
    onSale,
    featured,
    newest: diverseProducts(
      [...all]
        .filter((card) => !shownIds.has(card.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      perRail,
    ),
  };
}

/**
 * What else to look at, from the same rows every other card reads.
 *
 * The product page built its related cards by hand, filling a card shape
 * field by field and casting away the mismatch — so a related card showed
 * a list price where the shop showed the discounted one, and the two
 * disagreed about the same product on the same visit. Nearest first: the
 * same lighting type, then the rest of the family.
 */
export async function relatedCards(
  {
    productId,
    family,
    lightingTypeSlug,
  }: { productId: string; family: ProductFamily; lightingTypeSlug?: string },
  locale: string,
  limit = 10,
): Promise<ShopCard[]> {
  const cards = (await catalogueCards(locale)).filter(
    (card) => card.sectionType === family && card.productId !== productId,
  );

  const rank = (card: ShopCard) =>
    (lightingTypeSlug && card.lightingTypeSlug === lightingTypeSlug ? 0 : 1) +
    buyTier(card) * 2;

  return [...cards].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

/**
 * Cards for a list of product codes, in the order given — for the
 * recently-viewed rail, whose order is the shopper's own. A code that is
 * no longer an active product is simply left out.
 */
export async function cardsByProductIds(
  productIds: string[],
  locale: string,
): Promise<ShopCard[]> {
  if (productIds.length === 0) return [];
  const byCode = new Map(
    (await catalogueCards(locale)).map((card) => [card.productId, card]),
  );
  return productIds.flatMap((code) => byCode.get(code) ?? []);
}

/**
 * The products that serve an application: every card in one of its
 * families or lighting types, featured and in stock first. Interleaved by
 * type, so a space served by five types does not show ten of the one with
 * the most rows. Also returns how many active products each type holds,
 * so an application never links to a type with nothing in it.
 */
export async function applicationCards(
  { families = [], types }: { families?: ProductFamily[]; types: string[] },
  locale: string,
  limit = 12,
): Promise<{
  cards: ShopCard[];
  typeCounts: Record<string, number>;
  familyCounts: Partial<Record<ProductFamily, number>>;
}> {
  const all = await catalogueCards(locale);

  const typeCounts: Record<string, number> = {};
  const familyCounts: Partial<Record<ProductFamily, number>> = {};
  for (const card of all) {
    typeCounts[card.lightingTypeSlug] =
      (typeCounts[card.lightingTypeSlug] ?? 0) + 1;
    const family = card.sectionType as ProductFamily;
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
  }

  const rank = (card: ShopCard) => Number(!card.featured) + buyTier(card) * 2;
  const groups = [
    ...types.map((type) =>
      all.filter((card) => card.lightingTypeSlug === type),
    ),
    ...families.map((family) =>
      all.filter((card) => card.sectionType === family),
    ),
  ].map((group) => [...group].sort((a, b) => rank(a) - rank(b)));

  const cards: ShopCard[] = [];
  const seen = new Set<string>();
  for (
    let round = 0;
    cards.length < limit && groups.some((group) => group.length > round);
    round++
  ) {
    for (const group of groups) {
      const card = group[round];
      if (card && !seen.has(card.id) && cards.length < limit) {
        seen.add(card.id);
        cards.push(card);
      }
    }
  }
  return { cards, typeCounts, familyCounts };
}
