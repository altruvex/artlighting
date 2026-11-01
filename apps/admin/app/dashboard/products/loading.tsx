import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Products list placeholder: header with its actions, KPI row, the table. */
export default function ProductsLoading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton titleClassName="w-36" actions={["w-24", "w-24", "w-28", "w-28"]} />
      <StatCardsSkeleton count={3} className="grid-cols-2 lg:grid-cols-3" />
      <TableSkeleton rows={10} rowClassName="h-[3.25rem]" />
    </LoadingPage>
  );
}
