import { LoadingPage, PageHeaderSkeleton, SectionHeadingSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Bulbs placeholder: header, KPI row, then the catalogue and fixtures tables. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <SectionHeadingSkeleton />
            <TableSkeleton rows={6} />
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}
