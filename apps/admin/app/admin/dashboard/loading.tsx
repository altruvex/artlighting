import { PageShell } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard placeholder: header, four KPI tiles, table and status list. */
export default function DashboardLoading() {
  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="gap-0 py-4">
            <CardContent className="space-y-2 px-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-full max-w-xs" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </div>

        <Card className="h-fit gap-0 py-4">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
