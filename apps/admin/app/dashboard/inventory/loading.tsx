import { LoadingPage, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Inventory placeholder: header, KPI row, the stock table. */
export default function InventoryLoading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="grid-cols-2 lg:grid-cols-3" />
      <TableSkeleton rows={10} rowClassName="h-[3.25rem]" />
    </LoadingPage>
  );
}
