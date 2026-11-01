"use server";

import { auth } from "@/lib/auth-server";
import { limitAction } from "@/middleware/ratelimit";
import { productTag, reviewsTag } from "@/lib/cache.server";
import { updateTag } from "next/cache";
import {
  productReviewsSection,
  submitReview as submitReviewToDb,
  type ReviewInput,
  type ReviewsSection,
} from "@/lib/reviews.server";

export type SubmitReviewResult = { ok: true } | { ok: false; error: "not_signed_in" | "invalid" | "not_found" | "rate_limited" };

/** Writes the signed-in customer's review of a product. */
export async function submitReview(productId: string, input: ReviewInput): Promise<SubmitReviewResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not_signed_in" };
  if (!(await limitAction("review", userId))) return { ok: false, error: "rate_limited" };
  const result = await submitReviewToDb(userId, productId, input);
  if (result.ok) {
    // The list this customer is about to reload, and the rating on this
    // product's page.
    updateTag(reviewsTag(productId));
    updateTag(productTag(productId));
    // Not the catalogue: the stars on the cards catch up within its
    // lifetime (an hour at most). Dropping it for one rating rebuilt every
    // product page, the shop and the sitemap.
  }
  return result;
}

/**
 * A page of a product's reviews, for the client — "load more", and the
 * refresh right after this browser's own submitReview call. The initial
 * page is fetched server-side in the product page itself; this is what
 * runs afterwards, without a full page reload.
 */
export async function reviewsPage(productId: string, locale: string, page: number): Promise<ReviewsSection> {
  // Untrusted: a negative or fractional page made Prisma throw on `skip`.
  if (typeof productId !== "string" || productId.length === 0 || productId.length > 120) {
    return { reviews: [], hasMore: false, distribution: null, mine: null };
  }
  const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 1), 1000) : 1;
  const { userId } = await auth();
  return productReviewsSection(productId, locale, userId, safePage);
}

