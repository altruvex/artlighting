import { formatNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * A row of five stars, filled by fraction. Display only, so it renders on
 * the server; the clickable version is StarRatingInput
 * (star-rating-input.tsx), the one part that needs the browser.
 *
 * A partial star (a 4.3 average) is two stars stacked: a muted outline
 * underneath, and a filled one on top clipped to the fraction, rather than
 * three separate glyphs (full/half/empty) that only ever cover halves.
 */
export function StarRating({
  value,
  size = "sm",
  className,
}: {
  /** 0–5, fractional. */
  value: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const dim = size === "xs" ? "size-3.5" : size === "md" ? "size-5" : "size-4";

  return (
    <span className={cn("inline-flex", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, clamped - index)) * 100;
        return (
          <span key={index} className="relative">
            <Star className={cn(dim, "text-border")} strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={cn(dim, "fill-primary text-primary")} strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** The reader's own description of a fractional average, for screen readers. */
export function ratingLabel(value: number, count: number, locale: string): string {
  const ar = locale === "ar";
  const stars = formatNumber(Math.round(value * 10) / 10, ar ? "ar" : "en");
  const total = formatNumber(count, ar ? "ar" : "en");
  if (ar) return `${stars} من ٥ نجوم، من ${total} تقييم`;
  return `${stars} out of 5 stars, from ${total} review${count === 1 ? "" : "s"}`;
}
