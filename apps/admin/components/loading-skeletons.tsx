import { PageShell } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * Building blocks for the dashboard's loading.tsx files. Each one mirrors a
 * real component — PageHeader, StatCard, DataTable — at its real size and
 * surface, so the page settles into place instead of jumping when it loads.
 * A grey slab where a white card will be is a flash, not a placeholder.
 */

/** PageShell with the announcement screen readers get while it loads. */
export async function LoadingPage({ children, className }: { children: ReactNode; className?: string }) {
  const t = await getTranslations("Common");
  return (
    <PageShell className={className}>
      {/* sr-only is absolutely positioned, so it adds nothing to the rhythm. */}
      <span role="status" aria-live="polite" className="sr-only">
        {t("loading")}
      </span>
      {children}
    </PageShell>
  );
}

/** PageHeader: title, one-line description, and up to a few action buttons. */
export function PageHeaderSkeleton({
  actions = [],
  titleClassName = "w-40",
}: {
  /** Width class per action button, in order. */
  actions?: string[];
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className={cn("h-7", titleClassName)} />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((width, index) => (
            <Skeleton key={index} className={cn("h-8", width)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A row of StatCards. `className` carries the grid the page uses. */
export function StatCardsSkeleton({ count, className }: { count: number; className: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 py-4">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** DataTable: toolbar, bordered table with its header row, pagination line. */
export function TableSkeleton({
  rows = 8,
  rowClassName = "h-11",
  toolbar = true,
  footer = true,
}: {
  rows?: number;
  /** Row height: h-11 for one line of text, h-[3.25rem] for rows with a thumbnail. */
  rowClassName?: string;
  toolbar?: boolean;
  footer?: boolean;
}) {
  return (
    <div className="space-y-3">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-full sm:max-w-xs" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="ms-auto h-8 w-24" />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex h-9 items-center gap-6 border-b px-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={cn("flex items-center border-b px-3 last:border-0", rowClassName)}>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {footer && (
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
      )}
    </div>
  );
}

/** The heading over a flattened table section (dashboard, customer detail). */
export function SectionHeadingSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}
