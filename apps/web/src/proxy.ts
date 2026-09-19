import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create intl middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  // API routes live outside the [locale] segment — they serve JSON, not
  // localized pages. Without this the intl middleware redirects /api/cart to
  // /en/api/cart, which costs a round trip on every call.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Pages except static files
    "/((?!_next|_vercel|.*\\..*).*)",
    // API routes
    "/(api|trpc)(.*)",
  ],
};
