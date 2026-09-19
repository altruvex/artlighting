import { PageShell } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/** Customers list placeholder: header, KPI row, then the table frame. */
export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <PageShell>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t("loading")}</span>

        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-xl" />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-full sm:w-64" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24 ms-auto" />
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-2">
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
