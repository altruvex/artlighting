"use client";

import { authClient } from "./auth-client";
import Link from "next/link";
import type { ReactNode } from "react";

/** Client-side session state: `{ isLoaded, isSignedIn, userId }`. */
export function useAuth() {
  const { data: session, isPending } = authClient.useSession();
  return {
    isLoaded: !isPending,
    isSignedIn: !!session,
    userId: session?.user?.id ?? null,
  };
}

/** Client-side current user. */
export function useUser() {
  const { data: session, isPending } = authClient.useSession();
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
