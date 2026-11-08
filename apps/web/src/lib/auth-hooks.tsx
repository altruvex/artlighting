"use client";

import { authClient } from "./auth-client";
import { Link, usePathname } from "@/i18n/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

const noSubscribe = () => () => {};

/**
 * The session, held back until hydration is done. Pages are prerendered once
 * for every visitor, so the server HTML is always signed out; a session the
 * client already has cached (from an earlier navigation) would otherwise
 * render different markup on the first pass and fail hydration.
 */
function useHydratedSession() {
  const { data, isPending } = authClient.useSession();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return { session: hydrated ? data : null, isPending: !hydrated || isPending };
}

/** Client-side session state: `{ isLoaded, isSignedIn, userId }`. */
export function useAuth() {
  const { session, isPending } = useHydratedSession();
  return {
    isLoaded: !isPending,
    isSignedIn: !!session,
    userId: session?.user?.id ?? null,
  };
}

/** Client-side current user. */
export function useUser() {
  const { session, isPending } = useHydratedSession();
  return {
    isLoaded: !isPending,
    isSignedIn: !!session,
    user: session?.user ?? null,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  return isLoaded && !isSignedIn ? <>{children}</> : null;
}

/**
 * Where the auth page should send the customer afterwards: the page they
 * are on, unless it is the home page (the default anyway) or an auth page.
 * A locale-less path, as the i18n router hands out and takes back.
 */
function useReturnPath(override?: string): string | undefined {
  const pathname = usePathname();
  if (override !== undefined) return override;
  if (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return undefined;
  return pathname;
}

function authHref(page: "/sign-in" | "/sign-up", returnTo: string | undefined) {
  return returnTo ? { pathname: page, query: { redirect: returnTo } } : page;
}

/**
 * Sign-in / sign-up buttons linking to the app's own auth pages, in the
 * current locale, with the way back to this page in `redirect`.
 */
export function SignInButton({ children, redirect }: { children: ReactNode; redirect?: string }) {
  const returnTo = useReturnPath(redirect);
  return (
    <Link href={authHref("/sign-in", returnTo)} className="contents">
      {children}
    </Link>
  );
}

export function SignUpButton({ children, redirect }: { children: ReactNode; redirect?: string }) {
  const returnTo = useReturnPath(redirect);
  return (
    <Link href={authHref("/sign-up", returnTo)} className="contents">
      {children}
    </Link>
  );
}
