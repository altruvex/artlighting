import { PageShell } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the editor's shape: header, main column sections, aside cards. */
function SectionSkeleton({ rows = 4, columns = 2 }: { rows?: number; columns?: number }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="space-y-1.5 border-b bg-muted/40 px-4 py-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div
        className={columns === 2 ? "grid gap-4 p-4 sm:grid-cols-2" : "space-y-4 p-4"}
      >
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
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-4">
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={2} columns={1} />
          <SectionSkeleton rows={6} />
        </div>
        <div className="min-w-0 space-y-4">
          <SectionSkeleton rows={2} columns={1} />
          <SectionSkeleton rows={3} columns={1} />
          <SectionSkeleton rows={2} columns={1} />
        </div>
      </div>
    </PageShell>
  );
}
