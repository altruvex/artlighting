import "server-only";

import { prisma } from "@repo/database";
import {
  sellableFrom,
  familyFromSlug,
  inventorySelect,
  productBulbSelect,
  productDiscountRates,
  type ProductFamily,
} from "@repo/catalog";
import { bulbChoices } from "@repo/catalog/bulb-pricing";
import { applyRate, money, serializeMoney, serializeRate, subtractMoney } from "@repo/money";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { localizeSpecGroups, specGroupSelect } from "@/lib/spec-groups";

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
 */

export type ShopSort = "featured" | "price-asc" | "price-desc" | "discount" | "newest";

export interface ShopQuery {
  page: number;
  families: ProductFamily[];
  brands: string[];
  types: string[];
  onSale: boolean;
  priceMin: number | null;
  priceMax: number | null;
  sort: ShopSort;
  q: string;
}

const SORTS: ShopSort[] = ["featured", "price-asc", "price-desc", "discount", "newest"];

/** Reads the URL. Anything unrecognised is dropped rather than trusted. */
export function parseShopQuery(params: Record<string, string | string[] | undefined>): ShopQuery {
  const list = (key: string) =>
    ([] as string[])
      .concat(params[key] ?? [])
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
  const number = (key: string) => {
    const raw = list(key)[0];
    const value = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const sort = list("sort")[0] as ShopSort | undefined;
  const page = Math.max(1, Math.trunc(number("page") ?? 1) || 1);
  return {
    page,
    families: list("family").map(familyFromSlug).filter((f): f is ProductFamily => f !== null),
    brands: list("brand").filter((b) => b === "balcom" || b === "mister-led"),
    types: list("type"),
    onSale: list("sale")[0] === "1",
    priceMin: number("min"),
    priceMax: number("max"),
    sort: sort && SORTS.includes(sort) ? sort : "featured",
    q: (list("q")[0] ?? "").slice(0, 80),
  };
}

export function cardInclude(locale: string) {
  return {
    translations: { where: { language: locale }, take: 1 },
    specifications: { where: { language: locale }, take: 1 },
    images: productImageSelect(),
    variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
    specGroups: specGroupSelect(locale),
    bulbs: productBulbSelect(),
    lightingtype: { include: { translations: { where: { language: locale }, take: 1 } } },
  };
}

type CardRow = Awaited<ReturnType<typeof loadCardRows>>[number];

async function loadCardRows(locale: string, where: Record<string, unknown> = {}) {
  return prisma.product.findMany({
    where: { isActive: true, ...where },
    include: cardInclude(locale),
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
}

/** One product as every card renders it. */
export function toCard(row: CardRow, locale: string, rate: string) {
  const translation = row.translations?.[0];
  const spec = row.specifications?.[0];
  // What the shopper actually pays — the figure a price sort must use, or a
  // 30%-off chandelier sorts as though it cost its list price.
  const effective = subtractMoney(row.price, applyRate(row.price, rate));
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
    ratingAverage: row.ratingAverage !== null && row.ratingAverage !== undefined ? Number(row.ratingAverage) : null,
    ratingCount: row.ratingCount,
    isActive: row.isActive,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
    chandelierLightingType: row.chandelierLightingType || undefined,
    hNumber: row.hNumber || undefined,
    specGroups: localizeSpecGroups(row.specGroups ?? [], locale),
    bulbChoices: bulbChoices(row.bulbs, row.hNumber, locale),
    lightingTypeName: row.lightingtype?.translations?.[0]?.name ?? row.lightingtype?.name ?? undefined,
    lightingTypeSlug: row.spotlightType,
    maximumWattage: spec?.maximumWattage ?? undefined,
    mainMaterial: spec?.mainMaterial ?? undefined,
    beamAngle: spec?.beamAngle ?? undefined,
    lampBase: spec?.lampBase ?? undefined,
    translations: { name: translation?.name || undefined, description: translation?.description || undefined },
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

export async function searchShop(query: ShopQuery, locale: string): Promise<ShopResult> {
  const rows = await loadCardRows(locale);
  const rates = await productDiscountRates(rows, prisma);
  const all = rows.map((row) => toCard(row, locale, rates[row.id] ?? serializeRate(0)));

  const needle = query.q.toLocaleLowerCase(locale);
  const priceOf = (card: ShopCard) => Number(card.effectivePrice);

  // Each test is named so a facet can ask "everything but me".
  const tests = {
    family: (c: ShopCard) => query.families.length === 0 || query.families.includes(c.sectionType as ProductFamily),
    brand: (c: ShopCard) => query.brands.length === 0 || query.brands.includes(c.brand),
    type: (c: ShopCard) => query.types.length === 0 || query.types.includes(c.lightingTypeSlug),
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
    (Object.keys(tests) as TestName[]).every((name) => name === except || tests[name](card));

  const matched = all.filter((card) => passes(card));

  // A facet's counts ignore its own selection, so ticking "chandelier" does
  // not make "indoor" read 0 — the standard reading, and the useful one.
  const tally = (except: TestName, key: (c: ShopCard) => string, label: (c: ShopCard) => string) => {
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
        // The admin's featured flag first; the query already ordered the rest.
        return Number(b.featured) - Number(a.featured);
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
      ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
      : { min: 0, max: 0 },
    facets: {
      family: tally("family", (c) => c.sectionType, (c) => c.sectionType),
      brand: tally("brand", (c) => c.brand, (c) => c.brand),
      type: tally("type", (c) => c.lightingTypeSlug, (c) => c.lightingTypeName ?? c.lightingTypeSlug),
      sale: all.filter((card) => passes(card, "sale") && money(card.discount).greaterThan(0)).length,
    },
  };
}

export interface HomeData {
  families: { family: ProductFamily; count: number }[];
  /** Biggest saving first — the discount the shopper keeps, not the rate. */
  onSale: ShopCard[];
  /** The admin's featured flag, not a list of ids written into the page. */
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
export async function homeData(locale: string, perRail = 10): Promise<HomeData> {
  const rows = await loadCardRows(locale);
  const rates = await productDiscountRates(rows, prisma);
  const all = rows.map((row) => toCard(row, locale, rates[row.id] ?? serializeRate(0)));

  const saving = (card: ShopCard) => Number(card.price) - Number(card.effectivePrice);
  const inStock = (card: ShopCard) => card.quantity !== 0;

  const counts = new Map<ProductFamily, number>();
  for (const card of all) counts.set(card.sectionType as ProductFamily, (counts.get(card.sectionType as ProductFamily) ?? 0) + 1);

  const featured = all.filter((card) => card.featured);
  return {
    families: [...counts.entries()].map(([family, count]) => ({ family, count })),
    onSale: all
      .filter((card) => saving(card) > 0)
      // Something out of stock is not a deal anyone can take.
      .sort((a, b) => Number(inStock(b)) - Number(inStock(a)) || saving(b) - saving(a))
      .slice(0, perRail),
    // Falls back to the newest when nothing is flagged, rather than an
    // empty rail on a fresh catalogue.
    featured: (featured.length ? featured : all).slice(0, perRail),
    newest: [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, perRail),
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
  { productId, family, lightingTypeSlug }: { productId: string; family: ProductFamily; lightingTypeSlug?: string },
  locale: string,
  limit = 10,
): Promise<ShopCard[]> {
  const rows = await loadCardRows(locale, { sectionType: family, productId: { not: productId } });
  const rates = await productDiscountRates(rows, prisma);
  const cards = rows.map((row) => toCard(row, locale, rates[row.id] ?? serializeRate(0)));

  const rank = (card: ShopCard) =>
    (lightingTypeSlug && card.lightingTypeSlug === lightingTypeSlug ? 0 : 1) + (card.quantity !== 0 ? 0 : 2);

  return [...cards].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

/**
 * Cards for a list of product codes, in the order given — for the
 * recently-viewed rail, whose order is the shopper's own. A code that is
 * no longer an active product is simply left out.
 */
export async function cardsByProductIds(productIds: string[], locale: string): Promise<ShopCard[]> {
  if (productIds.length === 0) return [];
  const rows = await loadCardRows(locale, { productId: { in: productIds } });
  const rates = await productDiscountRates(rows, prisma);
  const byCode = new Map(rows.map((row) => [row.productId, toCard(row, locale, rates[row.id] ?? serializeRate(0))]));
  return productIds.flatMap((code) => byCode.get(code) ?? []);
}
