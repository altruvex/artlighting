import "server-only";

import { stageFor, type Db } from "@repo/catalog";
import { prisma } from "@repo/database";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOGUE_TAG, reviewsTag } from "@/lib/cache.server";

/**
 * Product reviews: reading them, and keeping a product's own
 * ratingAverage/ratingCount in step with its review rows.
 *
 * The average and count live on the product itself (denormalized), so a
 * shop grid of 117 products reads two columns each rather than
 * aggregating a reviews table 117 times per page view. Every review
 * write recomputes them in the same transaction as the write, so the two
 * can never drift.
 */

export const MAX_RATING = 5;
export const MIN_RATING = 1;
/** A review's body, trimmed. Long enough for a real account of using the
 * fixture, short enough that one review can't fill the whole section. */
export const MAX_REVIEW_BODY = 2000;
export const MAX_REVIEW_TITLE = 120;
const REVIEWS_PAGE_SIZE = 10;

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  /** The reviewer's own edit, so "أنت" replaces a name on the customer's own row. */
  isOwn: boolean;
  authorName: string;
}

/** A first name, or "a customer" — never a stranger's full name or email on a public page. */
function displayName(name: string, locale: string): string {
  const first = name.trim().split(/\s+/)[0];
  if (first) return first;
  return locale === "ar" ? "عميل" : "A customer";
}

/** One page of a product's reviews, newest first. `productCuid` is Product.id — Review.productId's own foreign key, not the human-readable product code. */
async function reviewsForProduct(
  productCode: string,
  productCuid: string,
  locale: string,
  viewerId: string | null,
  page = 1,
): Promise<{ reviews: ReviewView[]; hasMore: boolean }> {
  const rows = await reviewRows(productCode, productCuid, page);

  const hasMore = rows.length > REVIEWS_PAGE_SIZE;
  return {
    hasMore,
    reviews: rows.slice(0, REVIEWS_PAGE_SIZE).map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      verifiedPurchase: row.verifiedPurchase,
      createdAt: row.createdAt,
      isOwn: row.userId === viewerId,
      authorName: row.userId === viewerId ? (locale === "ar" ? "أنت" : "You") : displayName(row.authorName, locale),
    })),
  };
}

/**
 * The rows themselves, the same for every viewer and so cached; who "you"
 * are is applied on top by reviewsForProduct. Dropped by submitReview.
 */
async function reviewRows(productCode: string, productCuid: string, page: number) {
  "use cache";
  cacheTag(reviewsTag(productCode));
  cacheLife("hours");
  const rows = await prisma.review.findMany({
    where: { productId: productCuid },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * REVIEWS_PAGE_SIZE,
    take: REVIEWS_PAGE_SIZE + 1,
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      verifiedPurchase: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  return rows.map(({ user, createdAt, ...row }) => ({
    ...row,
    createdAt: createdAt.toISOString(),
    authorName: user.name,
  }));
}

/** How many reviews gave each star, 5 down to 1 — for the distribution bars. */
async function ratingDistribution(productCode: string, productCuid: string): Promise<Record<1 | 2 | 3 | 4 | 5, number>> {
  "use cache";
  cacheTag(reviewsTag(productCode));
  cacheLife("hours");
  const rows = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId: productCuid },
    _count: { rating: true },
  });
  const byStar = new Map(rows.map((row) => [row.rating, row._count.rating]));
  return {
    5: byStar.get(5) ?? 0,
    4: byStar.get(4) ?? 0,
    3: byStar.get(3) ?? 0,
    2: byStar.get(2) ?? 0,
    1: byStar.get(1) ?? 0,
  };
}

export interface ReviewsSection {
  reviews: ReviewView[];
  hasMore: boolean;
  /** Only sent with page 1: the distribution never changes within a session of paging. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number> | null;
  mine: { rating: number; title: string | null; body: string | null } | null;
}

const EMPTY_SECTION: ReviewsSection = { reviews: [], hasMore: false, distribution: null, mine: null };

/**
 * Everything a product's review section renders, for one page.
 *
 * Takes the product's own code ("jy-810-10w"), like every other reviews
 * entry point — the cuid Review.productId actually stores is resolved
 * here, once, rather than leaking into every caller. Reviews were written
 * correctly against that cuid from the start (submitReview below always
 * resolved it); this used to hand the read side the human-readable code
 * instead, so a freshly posted review updated the product's own rating but
 * never appeared in its own list.
 */
export async function productReviewsSection(
  productId: string,
  locale: string,
  viewerId: string | null,
  page = 1,
  /** Product.id when the caller already has it — saves the lookup. */
  knownCuid?: string,
): Promise<ReviewsSection> {
  const productCuid = knownCuid ?? (await productCuidFor(productId));
  if (!productCuid) return EMPTY_SECTION;
  const product = { id: productCuid };

  const [{ reviews, hasMore }, distribution, mine] = await Promise.all([
    reviewsForProduct(productId, product.id, locale, viewerId, page),
    page === 1 ? ratingDistribution(productId, product.id) : Promise.resolve(null),
    page === 1 && viewerId ? ownReview(product.id, viewerId) : Promise.resolve(null),
  ]);
  return { reviews, hasMore, distribution, mine };
}

/** A product code's cuid. It never changes for a code, so it is cached for as long as allowed. */
async function productCuidFor(productId: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  // A code created after a miss was cached must not stay "not found".
  cacheTag(CATALOGUE_TAG);
  const product = await prisma.product.findUnique({ where: { productId }, select: { id: true } });
  return product?.id ?? null;
}

/**
 * What the reviews section shows only to this viewer: their own review (to
 * prefill the form) and which row in the list is theirs. Kept apart from
 * the list so the list can be cached and prerendered for everyone, and
 * this streamed in per request.
 */
export async function viewerReviewState(
  productId: string,
  userId: string | null,
): Promise<{ mine: ReviewsSection["mine"]; ownReviewId: string | null }> {
  if (!userId) return { mine: null, ownReviewId: null };
  const productCuid = await productCuidFor(productId);
  if (!productCuid) return { mine: null, ownReviewId: null };
  const own = await prisma.review.findUnique({
    where: { productId_userId: { productId: productCuid, userId } },
    select: { id: true, rating: true, title: true, body: true },
  });
  if (!own) return { mine: null, ownReviewId: null };
  const { id, ...mine } = own;
  return { mine, ownReviewId: id };
}

/** This customer's own review of the product, if they have written one. */
async function ownReview(productCuid: string, userId: string): Promise<{ rating: number; title: string | null; body: string | null } | null> {
  return prisma.review.findUnique({
    where: { productId_userId: { productId: productCuid, userId } },
    select: { rating: true, title: true, body: true },
  });
}

/**
 * Whether this customer has an order for this product that reached them —
 * shipped, delivered or fulfilled, the same "sold" stage the inventory
 * ledger uses. Decided once, when a review is written, and stored on the
 * row: a later return must not quietly erase the badge on a review
 * describing a fixture the customer did receive.
 */
async function hasQualifyingPurchase(productId: string, userId: string, tx: Db): Promise<boolean> {
  const items = await tx.orderItem.findMany({
    where: { productId, order: { userId } },
    select: { order: { select: { status: true } } },
  });
  return items.some((item) => stageFor(item.order.status) === "sold");
}

/** Recomputes a product's ratingAverage/ratingCount from its review rows. */
async function recomputeProductRating(productId: string, tx: Db): Promise<void> {
  const summary = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingCount: summary._count,
      ratingAverage: summary._count > 0 ? summary._avg.rating : null,
    },
  });
}

export type ReviewInput = { rating: number; title?: string | null; body?: string | null };

export type SubmitReviewError = "invalid" | "not_found" | "not_signed_in";

/**
 * Writes a customer's review of a product — creating it, or replacing
 * their existing one, the way a receipt is never re-issued twice for the
 * same order. Validates and recomputes the product's rating in one
 * transaction, so a half-written review can never move the average.
 */
export async function submitReview(
  userId: string,
  productId: string,
  input: ReviewInput,
): Promise<{ ok: true } | { ok: false; error: SubmitReviewError }> {
  const rating = Math.trunc(input.rating);
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) return { ok: false, error: "invalid" };

  const title = input.title?.trim().slice(0, MAX_REVIEW_TITLE) || null;
  const body = input.body?.trim().slice(0, MAX_REVIEW_BODY) || null;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { productId }, select: { id: true, isActive: true } });
    if (!product) return { ok: false, error: "not_found" };

    const verifiedPurchase = await hasQualifyingPurchase(product.id, userId, tx);

    await tx.review.upsert({
      where: { productId_userId: { productId: product.id, userId } },
      create: { productId: product.id, userId, rating, title, body, verifiedPurchase },
      // A returning reviewer can only gain the badge, never lose one they
      // already earned by writing about a fixture that later shipped again.
      update: { rating, title, body, verifiedPurchase: verifiedPurchase || undefined },
    });

    await recomputeProductRating(product.id, tx);
    return { ok: true };
  });
}
