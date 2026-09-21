/**
 * Building shop URLs from the current query.
 *
 * Every filter is a link, not client state: it works before JavaScript
 * loads, the back button undoes it, and a filtered page can be shared. This
 * is the one place that knows how a query becomes a URL, so a chip, a
 * facet and the sort select cannot disagree about it.
 */

export type ShopParams = Record<string, string | string[] | undefined>;

const LIST_KEYS = new Set(["family", "brand", "type"]);

function toMap(params: ShopParams): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    const values = ([] as string[]).concat(raw).flatMap((v) => v.split(",")).filter(Boolean);
    if (values.length) map.set(key, values);
  }
  return map;
}

/** Narrowing the list invalidates the page number that went with the old one. */
function resetPage(map: Map<string, string[]>): Map<string, string[]> {
  map.delete("page");
  return map;
}

function toHref(map: Map<string, string[]>): string {
  const search = new URLSearchParams();
  for (const [key, values] of map) {
    if (values.length === 0) continue;
    search.set(key, LIST_KEYS.has(key) ? values.join(",") : values[0]!);
  }
  const query = search.toString();
  return query ? `/products?${query}` : "/products";
}

/** Adds the value if absent, removes it if present. */
export function toggleParam(params: ShopParams, key: string, value: string): string {
  const map = toMap(params);
  const current = map.get(key) ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  map.set(key, next);
  return toHref(resetPage(map));
}

export function setParam(params: ShopParams, key: string, value: string | null): string {
  const map = toMap(params);
  if (value === null || value === "") map.delete(key);
  else map.set(key, [value]);
  return toHref(key === "page" ? map : resetPage(map));
}

/** Drops several keys at once — a price range is two, and removing one of them is half a chip. */
export function removeParams(params: ShopParams, keys: string[]): string {
  const map = toMap(params);
  for (const key of keys) map.delete(key);
  return toHref(resetPage(map));
}

export function clearFilters(params: ShopParams): string {
  // The sort and the search survive "clear filters" — they are not filters.
  const map = toMap(params);
  for (const key of [...map.keys()]) if (key !== "sort" && key !== "q") map.delete(key);
  return toHref(resetPage(map));
}
