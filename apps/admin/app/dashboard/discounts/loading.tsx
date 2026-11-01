import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Discounts placeholder: header, KPI row, the table, the preview panel. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="grid-cols-2 lg:grid-cols-3" />
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-32" />
        </div>
        <TableSkeleton rows={6} />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </LoadingPage>
  );
}
