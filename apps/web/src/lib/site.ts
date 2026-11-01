/**
 * Where the site lives, in one place.
 *
 * The metadata helper had the origin typed into it and pointed every page's
 * canonical at the home page — so to a search engine the about page, the
 * shop and every product were all duplicates of "/". Pages now pass their
 * own path and get their own canonical and language alternates.
 */
// The bare domain is the site's address. www must redirect to it (308) in
// the host's domain settings, never the other way round: a canonical that
// points at a redirect tells search engines to index a URL that isn't there.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://artlighting-eg.com").replace(/\/$/, "");

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

/** "/about-us" → "https://…/en/about-us". The path has no locale prefix. */
export function absoluteUrl(locale: string, path = "") {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${SITE_URL}/${locale}${clean}`;
}

/** An absolute URL for a file in /public, for Open Graph and structured data. */
export function assetUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${encodeURI(path)}`;
}

/** The stable identifier the Organization node is published under, for other nodes to reference. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
