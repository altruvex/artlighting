import {
  familyFromSlug,
  familySlug,
  type ProductFamily,
} from "@repo/catalog/families";
import { LIGHTING_TYPES } from "@/content/lighting-types";
import type { ShopParams } from "./shop-url";

export type ShopSort =
  "featured" | "price-asc" | "price-desc" | "discount" | "newest";

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

const SORTS: ShopSort[] = [
  "featured",
  "price-asc",
  "price-desc",
  "discount",
  "newest",
];

/** Reads the URL. Anything unrecognised is dropped rather than trusted. */
export function parseShopQuery(
  params: Record<string, string | string[] | undefined>,
): ShopQuery {
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
    families: list("family")
      .map(familyFromSlug)
      .filter((f): f is ProductFamily => f !== null),
    brands: list("brand").filter((b) => b === "balcom" || b === "mister-led"),
    types: list("type"),
    onSale: list("sale")[0] === "1",
    priceMin: number("min"),
    priceMax: number("max"),
    sort: sort && SORTS.includes(sort) ? sort : "featured",
    q: (list("q")[0] ?? "").slice(0, 80),
  };
}

/** Equivalent filter URLs must share a cache entry, including generated links. */
export function normalizeShopParams(params: ShopParams): ShopParams {
  const query = parseShopQuery(params);
  const result: ShopParams = {};
  if (query.families.length)
    result.family = [...new Set(query.families)]
      .sort()
      .map(familySlug)
      .join(",");
  if (query.brands.length)
    result.brand = [...new Set(query.brands)].sort().join(",");
  if (query.types.length)
    result.type = [...new Set(query.types)].sort().join(",");
  if (query.onSale) result.sale = "1";
  if (query.priceMin !== null) result.min = String(query.priceMin);
  if (query.priceMax !== null) result.max = String(query.priceMax);
  if (query.sort !== "featured") result.sort = query.sort;
  if (query.q) result.q = query.q;
  if (query.page !== 1) result.page = String(query.page);
  return result;
}

/** Only the finite public landing shelves belong in the remote render cache. */
export function isCacheableShopQuery(query: ShopQuery): boolean {
  return (
    !query.q &&
    query.priceMin === null &&
    query.priceMax === null &&
    query.page === 1 &&
    query.sort === "featured" &&
    !query.onSale &&
    query.brands.length === 0 &&
    query.families.length <= 1 &&
    query.types.length <= 1 &&
    query.types.every((id) => LIGHTING_TYPES.some((type) => type.id === id && type.family === query.families[0]))
  );
}
