import { LoadingPage, PageHeaderSkeleton, TableSkeleton } from "@/components/loading-skeletons";

/** Orders list placeholder: header, then the table — its rows carry a thumbnail. */
export default function OrdersLoading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton titleClassName="w-32" />
      <TableSkeleton rows={12} rowClassName="h-[3.25rem]" />
    </LoadingPage>
  );
}
