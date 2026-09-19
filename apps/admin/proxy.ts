import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Deny by default: every admin route needs a session unless it is on the
 * allow-list below. A page added tomorrow is protected without anyone
 * remembering to add a check.
 *
 * This is NOT the security boundary. It only inspects the session cookie —
 * it doesn't validate it against the database (that would mean a DB round
 * trip on every request, and the proxy runs before the route does). Pages,
 * server actions and route handlers still call requireAdmin() /
 * requirePermission(), which verify the session for real.
 */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/api/auth", // Better Auth's own endpoints: sign-in, sign-out, session
  "/unauthorized",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  // API routes answer with a status; a redirect to an HTML page would be
  // parsed as a bogus payload by whatever called them.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const signIn = new URL("/sign-in", request.url);
  // Come back to the page that was asked for after signing in.
  if (pathname !== "/") signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    // Everything except Next's internals and files with an extension
    // (favicon, images, fonts…): those carry no admin data.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
