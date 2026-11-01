import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Customers list placeholder: header, KPI row, then the table. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="grid-cols-2 lg:grid-cols-3" />
      <TableSkeleton rows={8} rowClassName="h-[3.25rem]" />
    </LoadingPage>
  );
}
