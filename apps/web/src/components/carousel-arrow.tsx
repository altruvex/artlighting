"use client";

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";

/** One navigation control for galleries and product shelves. */
export function CarouselArrow({
  direction,
  rtl,
  label,
  loading = false,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  rtl: boolean;
  label: string;
  loading?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = (direction === "next") !== rtl ? ArrowRight : ArrowLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      aria-busy={loading || undefined}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-input bg-background text-foreground transition-colors duration-[var(--dur-hover)] hover:border-foreground/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-35"
    >
      {loading ? (
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
