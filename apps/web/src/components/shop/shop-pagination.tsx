import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/numbers";
import { setParam, type ShopParams } from "@/lib/shop-url";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Pages of results, as links.
 *
 * The shop rendered every match in one response — 117 cards, and every
 * image in them, before the first row was useful. The page number is part
 * of the URL like every filter here, so the back button, a shared link
 * and a crawler all see the same list.
 *
 * Numbers near the current page, ends always, an ellipsis for the gap:
 * enough to jump without printing a row of twenty.
 */
export async function ShopPagination({
  page,
  pageCount,
  params,
  locale,
}: {
  page: number;
  pageCount: number;
  params: ShopParams;
  locale: string;
}) {
  if (pageCount <= 1) return null;

  const t = await getTranslations({ locale, namespace: "shop" });
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");
  const href = (target: number) => setParam(params, "page", target === 1 ? null : String(target));

  // Arabic reads right to left, so "next" points the other way.
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;
  const Forward = locale === "ar" ? ChevronLeft : ChevronRight;

  const numbers: (number | "gap")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) numbers.push(i);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }

  return (
    <nav aria-label={t("pagination")} className="mt-12 flex flex-wrap items-center justify-center gap-2">
      <PageLink
        href={href(page - 1)}
        disabled={page === 1}
        label={t("prev")}
        className="gap-1 px-3"
      >
        <Back className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t("prev")}</span>
      </PageLink>

      {numbers.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink
            key={entry}
            href={href(entry)}
            current={entry === page}
            label={t("goToPage", { page: n(entry) })}
            className="w-10 justify-center tabular-nums"
          >
            {n(entry)}
          </PageLink>
        ),
      )}

      <PageLink href={href(page + 1)} disabled={page === pageCount} label={t("next")} className="gap-1 px-3">
        <span className="hidden sm:inline">{t("next")}</span>
        <Forward className="size-4" aria-hidden />
      </PageLink>

      <p className="w-full text-center text-[length:var(--text-sm)] text-muted-foreground sm:w-auto sm:ps-3">
        {t("pageOf", { page: n(page), pages: n(pageCount) })}
      </p>
    </nav>
  );
}

function PageLink({
  href,
  children,
  label,
  current,
  disabled,
  className,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const shared = cn(
    "inline-flex h-10 items-center rounded-md border text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)]",
    current
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border hover:border-primary/50 hover:text-primary",
    className,
  );

  if (disabled) {
    return (
      <span aria-hidden className={cn(shared, "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} aria-current={current ? "page" : undefined} className={shared}>
      {children}
    </Link>
  );
}
