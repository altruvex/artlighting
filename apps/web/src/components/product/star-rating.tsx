"use client";

import { formatNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

/**
 * A row of five stars, filled by fraction — one component for both the
 * places a rating is shown and the one place it is chosen.
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

/**
 * Five clickable stars — whole stars only, no half selection: a review is
 * one integer rating, the way a receipt is one total.
 */
export function StarRatingInput({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const dim = size === "lg" ? "size-8" : size === "md" ? "size-6" : "size-5";
  const shown = hovered ?? value;

  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const active = star <= shown;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={String(star)}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(star)}
            className="rounded-sm p-0.5 transition-transform duration-[var(--dur-press)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Star
              className={cn(dim, "transition-colors duration-[var(--dur-hover)]", active ? "fill-primary text-primary" : "text-border")}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
