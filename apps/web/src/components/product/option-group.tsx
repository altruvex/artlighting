import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * One look for every choice on the product page.
 *
 * Bulb, colour temperature and IP rating were three components with three
 * ideas of a selected button — filled gold pills with a drop shadow, each
 * titled at a different size. They are one kind of control, a single
 * choice from a short list, so they share a label, a grid and a chip.
 */
export function OptionGroup({
  label,
  selected,
  className,
  children,
}: {
  label: string;
  /** The current choice, repeated beside the label so it reads without scanning the chips. */
  selected?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2.5">
      <p className="flex items-baseline justify-between gap-3 text-[length:var(--text-sm)]">
        <span className="font-semibold">{label}</span>
        {selected && <span className="truncate text-muted-foreground">{selected}</span>}
      </p>
      <div className={cn("grid gap-2", className)}>{children}</div>
    </div>
  );
}

/** A chip in an OptionGroup. Pass role="radio" and aria-checked on the button. */
export function optionChip(active: boolean) {
  return cn(
    "relative flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-center",
    "text-[length:var(--text-sm)] font-medium tabular-nums",
    "transition-[border-color,background-color,color,transform] duration-[var(--dur-hover)] ease-[var(--ease-out)]",
    "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    active
      ? "border-primary bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--color-primary)]"
      : "border-border bg-background text-foreground/85 hover:border-foreground/30 hover:text-foreground",
  );
}

/** The small spinner a chip shows while its choice is being saved. */
export function ChipSpinner() {
  return <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-b-transparent" />;
}
