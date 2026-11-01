import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { GUEST_COOKIE } from "./lib/guest-token";
import { routing } from "./i18n/routing";
import { familyFromSlug, familySlug } from "@repo/catalog/families";
import { isKnownPath, legacyTarget } from "./lib/known-routes";

// Create intl middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  // API routes live outside the [locale] segment — they serve JSON, not
  // localized pages. Without this the intl middleware redirects /api/cart to
  // /en/api/cart, which costs a round trip on every call.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return withGuestToken(req, NextResponse.next());
  }

  const response = intlMiddleware(req);

  // The retired category funnel. The pages under it redirect too, but a
  // loading.tsx above them means the response has already started
  // streaming by the time they run, so the hop lands as a 200 with a
  // client-side redirect in the body — right for a visitor, wrong for a
  // crawler following a link that moved. Here it is a real 308.
  const moved = shopUrl(req.nextUrl.pathname) ?? legacyUrl(req.nextUrl.pathname);
  if (moved && !isRedirect(response)) {
    const url = new URL(moved, req.nextUrl.origin);
    return withGuestToken(req, NextResponse.redirect(url, 308));
  }

  // The status is forced on top of what next-intl decided, not instead of
  // it. Returning a bare rewrite here skipped the intl middleware
  // altogether, and the locale it passes downstream went with it: an
  // Arabic 404 came back with its heading in English.
  if ((unknownFamily(req.nextUrl.pathname) || unknownPath(req.nextUrl.pathname)) && !isRedirect(response)) {
    const notFound = NextResponse.rewrite(req.nextUrl, { status: 404 });
    response.headers.forEach((value, key) => notFound.headers.set(key, value));
    return withGuestToken(req, notFound);
  }

  return withGuestToken(req, response);
}

/** next-intl sends a locale-less URL to its prefixed form; leave that alone. */
function isRedirect(response: NextResponse): boolean {
  return response.status >= 300 && response.status < 400;
}

/**
 * Where a retired listing URL now lives, or null when the path is not one.
 *
 * /category, /category/<brand>, /category/<brand>/<section> and
 * /category/<brand>/<section>/<type> were four levels of a funnel the shop
 * page replaced; a product under them keeps its own URL and is left alone.
 */
function shopUrl(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const [locale, category, brand, section, type, product] = parts;
  if (category !== "category" || !routing.locales.includes(locale as never)) return null;
  // Five segments after the locale is a product page, not a listing.
  if (product) return null;

  const shop = `/${locale}/products`;
  if (!brand) return shop;
  if (brand !== "balcom" && brand !== "mister-led") return null;

  const query = new URLSearchParams({ brand });
  if (section) {
    const family = familyFromSlug(section);
    // An unknown section is a 404, handled below, not a redirect.
    if (!family) return null;
    query.set("family", familySlug(family));
    if (type) query.set("type", type.toLowerCase());
  }
  return `${shop}?${query.toString()}`;
}

/**
 * True for /<locale>/category/<brand>/<section> where the section is not one
 * of the three families.
 *
 * The page checks this too and calls notFound(), but by then the response has
 * started streaming (there is a loading.tsx above it), and a status cannot be
 * changed once the headers are out — so the route answers 200 with a 404 body.
 * Next injects `noindex` there, which is what keeps it out of search, but the
 * status is still wrong for logs and analytics. Setting it here, before the
 * stream, is what the framework recommends for a check this cheap: this one is
 * string comparison against three values, no database.
 */
function unknownFamily(pathname: string): boolean {
  const [, category, , section] = pathname.split("/").filter(Boolean);
  if (category !== "category" || !section) return false;
  return familyFromSlug(section) === null;
}

/** The locale and the segments after it, or null for a path without a locale. */
function localeSegments(pathname: string): { locale: string; segments: string[] } | null {
  const [locale, ...segments] = pathname.split("/").filter(Boolean);
  if (!locale || !routing.locales.includes(locale as never)) return null;
  return { locale, segments };
}

/** A URL an earlier version of the site published, now permanently elsewhere. */
function legacyUrl(pathname: string): string | null {
  const parsed = localeSegments(pathname);
  if (!parsed) return null;
  const target = legacyTarget(parsed.segments);
  if (target === null) return null;
  return `/${parsed.locale}${target === "/" ? "" : target}`;
}

/**
 * True for a path no route answers. The catch-all page renders the 404,
 * but — like the unknown family above — only after the response has begun
 * as a 200; this gives it the status it should have had.
 */
function unknownPath(pathname: string): boolean {
  const parsed = localeSegments(pathname);
  return parsed !== null && !isKnownPath(parsed.segments);
}

/**
 * Issues the anonymous-visitor token that owns guest configurations. It is
 * set here because server components can read cookies but cannot set them,
 * and configurations are created while rendering a product page.
 */
function withGuestToken(req: NextRequest, response: NextResponse): NextResponse {
  if (req.cookies.has(GUEST_COOKIE)) return response;

  response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: [
    // Pages except static files
    "/((?!_next|_vercel|.*\\..*).*)",
    // API routes
    "/(api|trpc)(.*)",
  ],
};
