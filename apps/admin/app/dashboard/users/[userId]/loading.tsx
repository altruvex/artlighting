import {
  LoadingPage,
  PageHeaderSkeleton,
  SectionHeadingSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/loading-skeletons";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Customer detail placeholder: header, KPI row, profile cards, order table. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton titleClassName="w-48" actions={["w-36"]} />
      <StatCardsSkeleton count={4} className="sm:grid-cols-2 lg:grid-cols-4" />

      <div className="grid gap-3 lg:grid-cols-3">
        {[1, 2].map((span) => (
          <Card key={span} className={span === 2 ? "gap-3 py-4 lg:col-span-2" : "gap-3 py-4"}>
            <CardContent className="space-y-3 px-4">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <SectionHeadingSkeleton />
        <TableSkeleton rows={5} rowClassName="h-[3.25rem]" />
      </div>
    </LoadingPage>
  );
}
