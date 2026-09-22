"use server";

import { auth } from "@/lib/auth-server";
import {
  productReviewsSection,
  submitReview as submitReviewToDb,
  type ReviewInput,
  type ReviewsSection,
} from "@/lib/reviews.server";

export type SubmitReviewResult = { ok: true } | { ok: false; error: "not_signed_in" | "invalid" | "not_found" };

/** Writes the signed-in customer's review of a product. */
export async function submitReview(productId: string, input: ReviewInput): Promise<SubmitReviewResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not_signed_in" };
  return submitReviewToDb(userId, productId, input);
}

/**
 * A page of a product's reviews, for the client — "load more", and the
 * refresh right after this browser's own submitReview call. The initial
 * page is fetched server-side in the product page itself; this is what
 * runs afterwards, without a full page reload.
 */
export async function reviewsPage(productId: string, locale: string, page: number): Promise<ReviewsSection> {
  const { userId } = await auth();
  return productReviewsSection(productId, locale, userId, page);
}

