import { PageShell } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/** Categories placeholder: header, KPI row, section cards beside the form. */
export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <PageShell>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t("loading")}</span>

        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-xl" />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-xl border p-3">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </PageShell>
  );
}
