import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton } from "@/components/loading-skeletons";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Categories placeholder: header, KPI row, section cards beside the form. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="gap-0 py-0">
              <div className="px-3 py-3">
                <Skeleton className="h-5 w-52" />
              </div>
              <div className="space-y-2 border-t px-3 py-2.5">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
              </div>
            </Card>
          ))}
        </div>
        <Card className="gap-3 py-4">
          <div className="space-y-3 px-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      </div>
    </LoadingPage>
  );
}
