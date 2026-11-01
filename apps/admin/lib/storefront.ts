import "server-only";

import { after } from "next/server";

/**
 * Tells the storefront (apps/web) that catalogue data changed, so it drops
 * its cached products, prices, stock and promotions instead of serving them
 * for up to 5 more minutes.
 *
 * The storefront is a separate Next app: this app's revalidateTag cannot
 * reach its cache, so it is an authenticated POST to its /api/revalidate.
 * Runs after the response (`after`), so an admin save never waits on it,
 * and a failure is logged, never thrown — the storefront's cache still
 * expires on its own.
 *
 * Needs NEXT_PUBLIC_APP_URL (the storefront's URL) and
 * STOREFRONT_REVALIDATE_SECRET (the same value in both apps).
 */
export function revalidateStorefront(tags: string[] = ["catalogue"]): void {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!base || !secret) return;

  after(async () => {
    try {
      const response = await fetch(new URL("/api/revalidate", base), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) console.error(`Storefront revalidation answered ${response.status} for ${tags.join(", ")}`);
    } catch (error) {
      console.error("Storefront revalidation failed:", error);
    }
  });
}
