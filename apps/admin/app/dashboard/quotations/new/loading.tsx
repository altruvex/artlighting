import { LoadingPage, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="space-y-1.5 border-b bg-muted/40 px-4 py-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Mirrors the quotation editor: header, sections beside the totals panel. */
export default function Loading() {
  return (
    <LoadingPage className="max-w-[1400px]">
      <PageHeaderSkeleton titleClassName="w-48" actions={["w-20", "w-28", "w-24"]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
        <div className="space-y-4">
          <SectionSkeleton rows={2} />
        </div>
      </div>
    </LoadingPage>
  );
}
