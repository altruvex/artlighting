import { PageShell } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/** Customer detail placeholder: header, KPI row, profile cards, order table. */
export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <PageShell>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t("loading")}</span>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-xl" />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>

        <div className="rounded-xl border p-4">
          <Skeleton className="mb-3 h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
