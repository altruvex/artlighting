/**
 * The spec view model and the helpers that read it.
 *
 * Deliberately free of `server-only` and of any Prisma import: the product
 * pages are Client Components, and they need to look a spec up by name. The
 * server-side half — the Prisma select and the formatting — lives in
 * lib/spec-groups.ts.
 */

export interface LocalizedSpecItem {
  /**
   * Language-neutral: "luminousFlux", "ip". Null on a row the spec backfill
   * has not reached.
   */
  key: string | null;
  label: string;
  /** Rendered for this locale — Arabic-Indic digits included. For display only. */
  value: string;
  /**
   * The first measurement as a plain number, for code that needs to compare
   * rather than show. `value` cannot be used for this: it renders "44" as
   * "٤٤" on an Arabic page, and `parseInt("٤٤")` is NaN — which is how an
   * IP44 fixture came to describe itself as indoor-only in Arabic while the
   * English called it weatherproof.
   */
  numeric: number | null;
}

export interface LocalizedSpecGroup {
  name: string;
  items: LocalizedSpecItem[];
}

/**
 * The spec values addressed by their language-neutral key.
 *
 * This is what a page needs when it wants *one* figure — the IP rating, the
 * energy saving — rather than the whole table. Looking one up by its
 * translated label is what broke the Arabic pages: the table is keyed in
 * Arabic there, so an English key found nothing at all.
 */
export function specsByKey(groups: LocalizedSpecGroup[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of groups) {
    for (const item of group.items) {
      if (item.key) out[item.key] = item.value;
    }
  }
  return out;
}

/** The same lookup, but the numbers — for comparing, never for showing. */
export function specNumbersByKey(groups: LocalizedSpecGroup[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of groups) {
    for (const item of group.items) {
      if (item.key && item.numeric !== null) out[item.key] = item.numeric;
    }
  }
  return out;
}
