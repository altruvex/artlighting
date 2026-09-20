import "server-only";

import { prisma } from "@repo/database";
import {
  availableFrom,
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
  return {
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
    quantity: availableFrom(row.variants[0]?.inventory),
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

export interface ShopResult {
  products: ShopCard[];
  total: number;
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
  return {
    products: sorted,
    total: sorted.length,
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
