import "server-only";
import { cookies } from "next/headers";

/**
 * Per-browser token that owns anonymous configurations.
 *
 * Configuration ids are cuids: timestamp + sequential counter + per-process
 * constant + a random tail, so they leak creation order and are not a
 * credential. This token is random, httpOnly and never leaves the cookie, so
 * it is what decides who may change or claim a configuration that has no
 * customer attached yet.
 *
 * The cookie is issued by the proxy (src/proxy.ts) on the first request, so
 * server components can read it even though they cannot set cookies.
 */
export const GUEST_COOKIE = "guest_id";

export async function readGuestToken(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

/**
 * Who may read or change this configuration:
 * - a row with a customer belongs to that customer;
 * - a row without one belongs to the browser whose token created it;
 * - a row with neither (created before this existed) is read-only, so a
 *   stranger can't adopt it by guessing the id.
 */
export function ownsConfiguration(
  row: { userId: string | null; guestToken: string | null },
  viewer: { userId: string | null; guestToken: string | null },
): boolean {
  if (row.userId) return Boolean(viewer.userId) && row.userId === viewer.userId;
  if (row.guestToken) return Boolean(viewer.guestToken) && row.guestToken === viewer.guestToken;
  return false;
}

/**
 * Strips the guest token before a configuration is sent to the browser.
 * The token lives in an httpOnly cookie precisely so page scripts can't read
 * it; echoing it back in JSON would undo that.
 */
export function publicConfiguration<T extends { guestToken?: string | null }>(
  configuration: T,
): Omit<T, "guestToken"> {
  const { guestToken: _guestToken, ...rest } = configuration;
  return rest;
}
