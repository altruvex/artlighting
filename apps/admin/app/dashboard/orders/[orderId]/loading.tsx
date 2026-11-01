import { LoadingPage } from "@/components/loading-skeletons";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Order detail placeholder: header, line items, totals, customer. */
export default function OrderDetailLoading() {
  return (
    <LoadingPage>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-52" />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="gap-0 py-4 lg:col-span-2">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44" />
            <div className="flex items-start gap-3 pt-2">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 py-4">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>

        <Card className="gap-0 py-4 lg:col-span-3">
          <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-7 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingPage>
  );
}
