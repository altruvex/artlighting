import { LoadingPage, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Mirrors the datasheet studio: editor sections beside the A4 preview. */
export default function Loading() {
  return (
    <LoadingPage className="max-w-[1500px]">
      <PageHeaderSkeleton titleClassName="w-56" actions={["w-20", "w-20", "w-24"]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {[3, 5, 2].map((rows, index) => (
            <Card key={index} className="gap-0 overflow-hidden py-0 shadow-none">
              <div className="border-b bg-muted/40 px-4 py-2.5">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-3 p-3">
                {Array.from({ length: rows }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[760px] rounded-sm" />
        </div>
      </div>
    </LoadingPage>
  );
}
