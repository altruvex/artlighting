import { PageShell } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/** Team placeholder: header, KPI row, invite card, then the admins table. */
export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <PageShell>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t("loading")}</span>

        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-52 rounded-xl" />

        <div className="rounded-lg border">
          <div className="border-b p-2">
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
