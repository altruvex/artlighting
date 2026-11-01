"use client";

import { reviewsPage, submitReview } from "@/actions/reviews";
import type { ProductPersonalState } from "@/lib/product-personal.server";
import type { ReviewsSection, ReviewView } from "@/lib/reviews.server";
import { useAuth } from "@/lib/auth-hooks";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { Textarea } from "@repo/ui/components/textarea";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ratingLabel, StarRating } from "./star-rating";
import { StarRatingInput } from "./star-rating-input";

const STARS = [5, 4, 3, 2, 1] as const;

/** Distribution's total and weighted mean, computed fresh from the counts on hand. */
function summarize(distribution: ReviewsSection["distribution"]) {
  if (!distribution) return { total: 0, average: 0 };
  const total = STARS.reduce((sum, star) => sum + distribution[star], 0);
  const weighted = STARS.reduce((sum, star) => sum + star * distribution[star], 0);
  return { total, average: total > 0 ? weighted / total : 0 };
}

/**
 * A product's reviews: the average, the distribution, the list, and the
 * one form a signed-in customer writes theirs in.
 *
 * The average and distribution are recomputed here from the counts on
 * hand rather than read from a separate field, so the header updates the
 * instant a review is posted — the same page load that shows the new
 * review in the list shows it in the average too.
 */
export function ProductReviews({
  productId,
  locale,
  initial,
  personal,
}: {
  productId: string;
  locale: string;
  /** Everyone's view: the list is prerendered, so no row is marked as the viewer's. */
  initial: ReviewsSection;
  /** Fetched after the page loads: the viewer's own review and which row is theirs. */
  personal: ProductPersonalState | null;
}) {
  const t = useTranslations("reviews");
  // From the session cookie, not a prop: the page around this is the same
  // prerendered HTML for every visitor.
  const { isSignedIn: signedIn } = useAuth();
  const [reviews, setReviews] = useState<ReviewView[]>(initial.reviews);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [distribution, setDistribution] = useState(initial.distribution);
  const [mine, setMine] = useState(initial.mine);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(initial.mine?.rating ?? 0);
  const [title, setTitle] = useState(initial.mine?.title ?? "");
  const [body, setBody] = useState(initial.mine?.body ?? "");
  const [isSubmitting, startSubmit] = useTransition();

  const adoptViewer = useCallback(
    ({ mine: own, ownReviewId }: ProductPersonalState["review"]) => {
      if (!own) return;
      setMine(own);
      setRating(own.rating);
      setTitle(own.title ?? "");
      setBody(own.body ?? "");
      if (ownReviewId) {
        const you = locale === "ar" ? "أنت" : "You";
        setReviews((rows) => rows.map((row) => (row.id === ownReviewId ? { ...row, isOwn: true, authorName: you } : row)));
      }
    },
    [locale],
  );

  useEffect(() => {
    if (personal) adoptViewer(personal.review);
  }, [personal, adoptViewer]);
  const [isLoadingMore, startLoadMore] = useTransition();

  const { total, average } = summarize(distribution);
  const ar = locale === "ar";

  const refresh = () => {
    startSubmit(async () => {
      const next = await reviewsPage(productId, locale, 1);
      setReviews(next.reviews);
      setHasMore(next.hasMore);
      setDistribution(next.distribution);
      setMine(next.mine);
      setPage(1);
    });
  };

  const handleSubmit = () => {
    if (rating < 1) {
      toast.error(t("ratingRequired"));
      return;
    }
    startSubmit(async () => {
      const result = await submitReview(productId, { rating, title, body });
      if (!result.ok) {
        toast.error(t("submitError"));
        return;
      }
      toast.success(t("submitSuccess"));
      setFormOpen(false);
      refresh();
    });
  };

  const loadMore = () => {
    startLoadMore(async () => {
      const next = await reviewsPage(productId, locale, page + 1);
      setReviews((prev) => [...prev, ...next.reviews]);
      setHasMore(next.hasMore);
      setPage((current) => current + 1);
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-14">
      {/* Summary: the figure, the stars, and the shape of the votes behind it. */}
      <div className="space-y-6">
        {total > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <p className="font-[family-name:var(--font-display-face)] text-[length:var(--text-4xl)] font-semibold tabular-nums">
                {formatNumber(Math.round(average * 10) / 10, ar ? "ar" : "en")}
              </p>
              <div className="space-y-1">
                <StarRating value={average} size="md" />
                <p className="sr-only">{ratingLabel(average, total, locale)}</p>
                <p className="text-[length:var(--text-sm)] text-muted-foreground">
                  {t("basedOn", { count: total, formatted: formatNumber(total, ar ? "ar" : "en") })}
                </p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {STARS.map((star) => {
                const count = distribution?.[star] ?? 0;
                const percent = total > 0 ? (count / total) * 100 : 0;
                return (
                  <li key={star} className="flex items-center gap-2 text-[length:var(--text-xs)]">
                    <span className="w-10 shrink-0 text-muted-foreground">
                      {t("starsLabel", { formatted: formatNumber(star, ar ? "ar" : "en") })}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-end tabular-nums text-muted-foreground">
                      {formatNumber(count, ar ? "ar" : "en")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="space-y-1">
            <p className="font-medium">{t("noReviews")}</p>
            <p className="text-[length:var(--text-sm)] text-muted-foreground">{t("beFirst")}</p>
          </div>
        )}

        {/* Write / edit a review. */}
        {!signedIn ? (
          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center text-[length:var(--text-sm)] font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("signInToReview")}
          </Link>
        ) : !formOpen ? (
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            {mine ? t("editReview") : t("writeReview")}
          </Button>
        ) : (
          <div className="space-y-4 rounded-md border border-border p-5">
            <div className="space-y-2">
              <p className="text-[length:var(--text-sm)] font-medium">{t("yourRating")}</p>
              <StarRatingInput value={rating} onChange={setRating} label={t("yourRating")} />
            </div>
            <div className="space-y-2">
              <label htmlFor="review-title" className="text-[length:var(--text-sm)] font-medium">
                {t("titleLabel")}
              </label>
              <Input
                id="review-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("titlePlaceholder")}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="review-body" className="text-[length:var(--text-sm)] font-medium">
                {t("bodyLabel")}
              </label>
              <Textarea
                id="review-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t("bodyPlaceholder")}
                maxLength={2000}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("submitting")}
                  </>
                ) : mine ? (
                  t("update")
                ) : (
                  t("submit")
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* The reviews themselves. */}
      <div>
        {reviews.length > 0 && (
          <ul className="divide-y divide-border">
            {reviews.map((review) => (
              <li key={review.id} className="space-y-2 py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StarRating value={review.rating} />
                  <span className="font-medium">{review.authorName}</span>
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-medium text-primary">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {t("verifiedPurchase")}
                    </span>
                  )}
                  <span className="text-[length:var(--text-xs)] tabular-nums text-muted-foreground">
                    {formatDate(new Date(review.createdAt), locale)}
                  </span>
                </div>
                {review.title && <p className="font-semibold">{review.title}</p>}
                {review.body && (
                  <p className={cn("text-pretty leading-relaxed text-muted-foreground")}>{review.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="mt-4">
            {isLoadingMore && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}
