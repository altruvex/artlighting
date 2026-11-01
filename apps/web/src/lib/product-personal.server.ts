import "server-only";

import { auth } from "@/lib/auth-server";
import { findConfiguration } from "@/lib/configuration.server";
import { readGuestToken } from "@/lib/guest-token";
import { viewerReviewState } from "@/lib/reviews.server";
import type { Configuration } from "@/types/products";

/**
 * The only parts of a product page that depend on who is looking: their
 * saved configuration (the options they picked last time) and their own
 * review.
 *
 * The product page used to read the session before rendering anything, so
 * the whole page — gallery, specs, related products, reviews — rendered
 * per request; under 100 concurrent visitors that was ~1.4 s a page. Now
 * the page is prerendered once for everyone and the browser asks for this
 * after it loads (actions/configuration.ts `productPersonal`, called from
 * ProductDetail).
 */
export interface ProductPersonalState {
  configuration: Configuration | null;
  review: Awaited<ReturnType<typeof viewerReviewState>>;
}

export async function productPersonalState(productCode: string): Promise<ProductPersonalState> {
  const [{ userId }, guestToken] = await Promise.all([auth(), readGuestToken()]);
  const [configuration, review] = await Promise.all([
    findConfiguration(productCode, userId, guestToken),
    viewerReviewState(productCode, userId),
  ]);
  return { configuration, review };
}
