import { LoadingPage } from "@/components/loading-skeletons";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

/** Mirrors the new-product form: header, then the three section cards. */
function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="space-y-1.5 border-b bg-muted/40 px-4 py-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="space-y-4 p-4">
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

export default function Loading() {
  return (
    <LoadingPage>
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SectionSkeleton rows={3} />
        <div className="space-y-4">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    </LoadingPage>
  );
}
