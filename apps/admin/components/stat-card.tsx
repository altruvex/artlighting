import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Compact KPI tile: label and icon on one line, then the value across the
 * card's full width, then an optional hint.
 *
 * The value is sized to the card (a container query), not the viewport: in a
 * four-up row an amount like "EGP 145,273.62" ran past the edge at a fixed
 * 1.5rem and was clipped — a figure you could not read. It now scales between
 * 1rem and 1.5rem with the card's width, and if it still does not fit it
 * wraps rather than being cut off.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("@container gap-0 py-4", className)}>
      <CardContent className="space-y-1 px-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 line-clamp-2 text-xs font-medium text-pretty text-muted-foreground">{label}</p>
          {/* A quiet glyph, not a tinted tile: four gold squares in a row
              were the loudest thing on the page and said nothing the label
              did not. */}
          {Icon && <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground/70" strokeWidth={1.75} />}
        </div>
        <p className="font-display pt-1 text-[clamp(1.125rem,10cqi,1.75rem)] leading-tight font-medium tabular-nums tracking-tight [overflow-wrap:anywhere]">
          {value}
        </p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
