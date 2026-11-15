import { useTranslations } from "next-intl";
import { SECTION_FRAME } from "@/components/section-heading";
import { cn } from "@/lib/utils";

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
    />
  );
}

function LoadingFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("loading");
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${SECTION_FRAME} min-h-[60dvh] py-6 lg:py-8`}
    >
      <span className="sr-only">{t("title")}</span>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden motion-reduce:hidden"
      >
        <div className="h-full w-1/3 animate-[loading-sweep_1.1s_var(--ease-in-out)_infinite] bg-primary" />
      </div>
      {children}
    </div>
  );
}

export function PageLoading() {
  return (
    <LoadingFrame>
      <Placeholder className="mb-8 h-3 w-40" />
      <Placeholder className="h-8 w-2/3 max-w-96" />
      <Placeholder className="mt-4 h-4 w-full max-w-xl" />
      <Placeholder className="mt-2 h-4 w-4/5 max-w-md" />
      <div
        aria-hidden
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((index) => (
          <Placeholder key={index} className="aspect-[4/3]" />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function ShopLoading() {
  return (
    <LoadingFrame>
      <Placeholder className="mb-6 h-3 w-40" />
      <Placeholder className="h-9 w-48" />
      <div
        aria-hidden
        className="mt-6 flex items-center justify-between gap-4 border-y border-border py-4"
      >
        <Placeholder className="h-5 w-28" />
        <Placeholder className="h-10 w-32" />
      </div>
      <div
        aria-hidden
        className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <div key={index} className="space-y-3">
            <Placeholder className="aspect-square" />
            <Placeholder className="h-3 w-1/2" />
            <Placeholder className="h-5 w-4/5" />
            <Placeholder className="h-5 w-24" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}

export function ProductPageLoading() {
  return (
    <LoadingFrame>
      <Placeholder className="mb-6 h-3 w-2/3 max-w-sm" />
      <div
        aria-hidden
        className="grid items-start gap-x-10 gap-y-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-14"
      >
        <div className="space-y-3 md:col-start-2 md:row-start-1">
          <Placeholder className="h-3 w-24" />
          <Placeholder className="h-8 w-4/5" />
          <Placeholder className="h-4 w-full" />
        </div>
        <div className="space-y-3 md:col-start-1 md:row-start-1 md:row-span-2">
          <Placeholder className="aspect-[4/3] md:aspect-square" />
          <div className="flex gap-2">
            <Placeholder className="size-14" />
            <Placeholder className="size-14" />
          </div>
        </div>
        <div className="space-y-6 md:col-start-2 md:row-start-2">
          <div className="space-y-3 border-b border-border pb-5">
            <Placeholder className="h-3 w-20" />
            <Placeholder className="h-8 w-40" />
            <Placeholder className="h-3 w-20" />
          </div>
          {[0, 1].map((index) => (
            <div key={index} className="space-y-3">
              <Placeholder className="h-4 w-32" />
              <div className="grid grid-cols-3 gap-2">
                <Placeholder className="h-11" />
                <Placeholder className="h-11" />
                <Placeholder className="h-11" />
              </div>
            </div>
          ))}
          <Placeholder className="h-12 w-32" />
          <Placeholder className="h-12 w-full" />
          <Placeholder className="h-12 w-full" />
        </div>
      </div>
    </LoadingFrame>
  );
}
