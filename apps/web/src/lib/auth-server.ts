import "server-only";
import { headers } from "next/headers";
import { auth as authInstance } from "./auth";

/** Current customer's id from the Better Auth session, or null when signed out. */
export async function auth() {
  const session = await authInstance.api.getSession({ headers: await headers() });
  return { userId: session?.user?.id ?? null };
}

/** Current customer's Better Auth user, or null when signed out. */
export async function currentUser() {
  const session = await authInstance.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session.user;
}
