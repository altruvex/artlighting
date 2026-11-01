"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

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
    <div role="radiogroup" aria-label={label} className="-ms-1.5 flex" onMouseLeave={() => setHovered(null)}>
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
            // Padded to a finger-sized target; the negative start margin on the
            // group keeps the first star on the label's edge.
            className="rounded-sm p-1.5 transition-transform duration-[var(--dur-press)] ease-[var(--ease-out)] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Star
              className={cn(dim, "transition-colors duration-[var(--dur-hover)]", active ? "fill-primary text-primary" : "text-input")}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
