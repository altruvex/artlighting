import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
  danger: "bg-destructive/12 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Status pill. The tone is a redundant cue — the label always carries the
 * meaning, so the badge stays readable without colour (WCAG 1.4.1).
 */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
