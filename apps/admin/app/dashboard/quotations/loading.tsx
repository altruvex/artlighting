import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Quotations placeholder: header, KPI row, then the table. */
export default function Loading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton actions={["w-32"]} />
      <StatCardsSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />
      <TableSkeleton rows={8} rowClassName="h-[3.25rem]" />
    </LoadingPage>
  );
}
