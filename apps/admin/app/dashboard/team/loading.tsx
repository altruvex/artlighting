import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Team placeholder: header, KPI row, the add-staff card, the admins table. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton titleClassName="w-32" />
      <StatCardsSkeleton count={4} className="sm:grid-cols-2 lg:grid-cols-4" />
      <div className="space-y-3">
        <Card className="gap-3 py-4">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-4 w-36" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
        <TableSkeleton rows={4} />
      </div>
    </LoadingPage>
  );
}
