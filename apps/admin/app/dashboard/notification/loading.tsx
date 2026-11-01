import { LoadingPage, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Notifications placeholder: header, then the single panel. */
export default function NotificationLoading() {
  return (
    <LoadingPage>
      <PageHeaderSkeleton />
      <Card className="items-center gap-3 py-12">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </Card>
    </LoadingPage>
  );
}
