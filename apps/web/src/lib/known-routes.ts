import { APPLICATIONS } from "@/content/applications";
import { GUIDE } from "@/content/guide";
import { COLLECTION_HREF } from "@/app/[locale]/(main)/(pages)/new-collection/collection-links";
import { projectsFor } from "@/lib/projects";

/**
 * Which paths the storefront answers, checked in the proxy before a page
 * renders.
 *
 * Every page streams (there is a loading.tsx above them), so a notFound()
 * inside one arrives after the headers: the visitor sees the 404 page but
 * the status is 200 — a soft 404, which search engines report as an error
 * and which kept every mistyped or retired URL looking alive. The status
 * can only be set before the stream starts, so the check is made here,
 * against lists that already exist in the code: no database.
 *
 * Product pages are not checked here — that needs the database. They are
 * prerendered at build, and a missing one still carries `noindex`.
 */

/** Pages with no child routes: anything below them is unknown. */
const LEAF_PAGES = new Set([
  "about-us",
  "blog",
  "contact-us",
  "faqs",
  "privacy",
  "products",
  "returns",
  "services",
  "shipping",
  "terms",
  "thank-you",
  "warranty",
  "sign-in",
  "sign-up",
  "confirm",
  "complete",
]);

/** Pages with one level of children, and the children that exist. */
const SLUG_PAGES: Record<string, () => Set<string>> = {
  "all-projects": () => new Set(projectsFor("en").map((project) => project.ProjectId)),
  applications: () => new Set(APPLICATIONS.map((application) => application.slug)),
  "lighting-guide": () => new Set(GUIDE.map((article) => article.slug)),
  "new-collection": () => new Set(Object.keys(COLLECTION_HREF)),
};

/** Routes whose deeper segments are checked elsewhere (the proxy's category rules, the product page). */
const OPEN_PAGES = new Set(["category", "preview"]);

const slugCache = new Map<string, Set<string>>();
function slugsOf(page: string): Set<string> {
  let slugs = slugCache.get(page);
  if (!slugs) {
    slugs = SLUG_PAGES[page]!();
    slugCache.set(page, slugs);
  }
  return slugs;
}

/** `segments` is the path after the locale: [] for the home page. */
export function isKnownPath(segments: string[]): boolean {
  const [page, slug, ...rest] = segments;
  if (page === undefined) return true;
  if (OPEN_PAGES.has(page)) return true;
  if (LEAF_PAGES.has(page)) return slug === undefined;
  if (page in SLUG_PAGES) {
    if (slug === undefined) return true;
    return rest.length === 0 && slugsOf(page).has(slug);
  }
  return false;
}

/**
 * URLs the previous sites published, and where each now lives.
 *
 * "collections" was a link in the old header that had no page behind it;
 * "default" is the home page of the site before that, still in Google's
 * index. Each answers with a permanent redirect so what they earned in
 * search passes to the page that replaced them.
 */
export function legacyTarget(segments: string[]): string | null {
  const [page, slug, ...rest] = segments.map((segment) => segment.toLowerCase());
  if (page === "default" || page === "default.aspx" || page === "home" || page === "index") return rest.length || slug ? null : "/";
  if (page === "collections" && slug === undefined) return "/new-collection";
  // The collection detail pages redirected from inside the page, which by
  // then was streaming: a client-side hop that crawlers do not follow.
  if (page === "new-collection" && slug !== undefined && rest.length === 0) return COLLECTION_HREF[slug] ?? "/new-collection";
  return null;
}
