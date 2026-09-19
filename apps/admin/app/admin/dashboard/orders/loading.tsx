import { PageShell } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Orders list placeholder: header, table toolbar, rows. */
export default function OrdersLoading() {
  return (
    <PageShell>
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-full max-w-xs" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24 ms-auto" />
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    </PageShell>
  );
}
