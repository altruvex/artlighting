"use client";

import { authClient } from "./auth-client";
import Link from "next/link";
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

/** Sign-in / sign-up buttons linking to the app's own auth pages. */
export function SignInButton({ children }: { children: ReactNode }) {
  return (
    <Link href="/sign-in" className="contents">
      {children}
    </Link>
  );
}

export function SignUpButton({ children }: { children: ReactNode }) {
  return (
    <Link href="/sign-up" className="contents">
      {children}
    </Link>
  );
}
