import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { GUEST_COOKIE } from "./lib/guest-token";
import { routing } from "./i18n/routing";

// Create intl middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  // API routes live outside the [locale] segment — they serve JSON, not
  // localized pages. Without this the intl middleware redirects /api/cart to
  // /en/api/cart, which costs a round trip on every call.
  const response = req.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.next()
    : intlMiddleware(req);

  return withGuestToken(req, response);
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
