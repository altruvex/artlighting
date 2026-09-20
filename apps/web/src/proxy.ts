import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { GUEST_COOKIE } from "./lib/guest-token";
import { routing } from "./i18n/routing";
import { familyFromSlug } from "@repo/catalog/families";

// Create intl middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  // API routes live outside the [locale] segment — they serve JSON, not
  // localized pages. Without this the intl middleware redirects /api/cart to
  // /en/api/cart, which costs a round trip on every call.
  const response = req.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.next()
    : unknownFamily(req.nextUrl.pathname)
      ? NextResponse.rewrite(req.nextUrl, { status: 404 })
      : intlMiddleware(req);

  return withGuestToken(req, response);
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
