import {
  LoadingPage,
  PageHeaderSkeleton,
  SectionHeadingSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/loading-skeletons";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/**
 * Dashboard placeholder: header, four KPI tiles, the recent-orders table and
 * the status panel — beside it only when the page is wide enough, as on the
 * page itself.
 */
export default function DashboardLoading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton actions={["w-32"]} />
      <StatCardsSkeleton count={4} className="sm:grid-cols-2 xl:grid-cols-4" />

      <div className="@container">
        <div className="grid gap-5 @[82rem]:grid-cols-[minmax(0,1fr)_18rem] @[82rem]:gap-3">
          <div className="min-w-0 space-y-2">
            <SectionHeadingSkeleton />
            <TableSkeleton rows={10} />
          </div>

          <Card className="h-fit gap-0 py-4">
            <CardContent className="space-y-3 px-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingPage>
  );
}
