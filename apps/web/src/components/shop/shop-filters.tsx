"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { formatNumber } from "@/lib/numbers";
import type { Facet, ShopQuery } from "@/lib/shop.server";
import { removeParams, setParam, toggleParam, type ShopParams } from "@/lib/shop-url";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

interface Props {
  query: ShopQuery;
  facets: { family: Facet[]; brand: Facet[]; type: Facet[]; sale: number };
  priceBounds: { min: number; max: number };
  params: ShopParams;
}

/**
 * The filter rail: a sticky column beside the grid on a wide screen, a sheet
 * from the side on a phone. The same markup renders in both, so a filter
 * cannot exist on one and not the other.
 *
 * Every option is a link carrying its count. The counts exclude the facet's
 * own selection — tick "chandelier" and "indoor" still says how many it
 * would add — and an option that would lead to nothing is shown disabled
 * rather than left to produce an empty page.
 */
export function ShopFilters(props: Props) {
  const t = useTranslations("shop");
  const [open, setOpen] = useState(false);
  const activeCount =
    props.query.families.length +
    props.query.brands.length +
    props.query.types.length +
    (props.query.onSale ? 1 : 0) +
    (props.query.priceMin !== null || props.query.priceMax !== null ? 1 : 0);

  // A filter link navigates; the sheet should not stay open over the result.
  useEffect(() => {
    setOpen(false);
  }, [props.params]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-2 self-start rounded-md border border-border bg-card px-4 py-2 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary/60 lg:hidden"
        aria-expanded={open}
        aria-controls="shop-filters"
      >
        <SlidersHorizontalIcon className="size-4" aria-hidden />
        {t("filter")}
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[length:var(--text-2xs)] tabular-nums text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="shop-filters"
        aria-label={t("filter")}
        className={cn(
          // Phone: a sheet from the inline-end edge. Desktop: a sticky column.
          "fixed inset-y-0 end-0 z-50 w-[min(22rem,90vw)] overflow-y-auto bg-background p-6 shadow-[var(--shadow-e3)] transition-transform duration-[var(--dur-sheet)] ease-[var(--ease-drawer)]",
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
          "lg:sticky lg:top-24 lg:z-auto lg:h-fit lg:max-h-[calc(100dvh-7rem)] lg:w-auto lg:translate-x-0 lg:bg-transparent lg:p-0 lg:shadow-none rtl:lg:translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="text-[length:var(--text-lg)] font-semibold">{t("filter")}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-md hover:bg-muted"
            aria-label={t("close")}
          >
            <XIcon className="size-5" aria-hidden />
          </button>
        </div>
        <FilterBody {...props} />
      </aside>
    </>
  );
}

function FilterBody({ query, facets, priceBounds, params }: Props) {
  const t = useTranslations("shop");
  const tFamily = useTranslations("family");
  const locale = useLocale();
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");

  return (
    <div className="space-y-8">
      <Group title={t("group.sale")}>
        <Option
          href={setParam(params, "sale", query.onSale ? null : "1")}
          selected={query.onSale}
          label={t("onSale")}
          count={facets.sale}
          n={n}
        />
      </Group>

      <Group title={t("group.family")}>
        {facets.family.map((facet) => (
          <Option
            key={facet.value}
            href={toggleParam(params, "family", familySlug(facet.value as ProductFamily))}
            selected={query.families.includes(facet.value as ProductFamily)}
            label={tFamily(facet.value)}
            count={facet.count}
            n={n}
          />
        ))}
      </Group>

      <Group title={t("group.brand")}>
        {facets.brand.map((facet) => (
          <Option
            key={facet.value}
            href={toggleParam(params, "brand", facet.value)}
            selected={query.brands.includes(facet.value)}
            label={facet.value === "balcom" ? t("brand.balcom") : t("brand.misterLed")}
            count={facet.count}
            n={n}
          />
        ))}
      </Group>

      <Group title={t("group.price")}>
        <PriceRange query={query} bounds={priceBounds} params={params} />
      </Group>

      {facets.type.length > 1 && (
        <Group title={t("group.type")}>
          <div className="max-h-72 space-y-0.5 overflow-y-auto pe-1">
            {facets.type.map((facet) => (
              <Option
                key={facet.value}
                href={toggleParam(params, "type", facet.value)}
                selected={query.types.includes(facet.value)}
                label={facet.label}
                count={facet.count}
                n={n}
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 font-[family-name:var(--font-body)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Option({
  href,
  selected,
  label,
  count,
  n,
}: {
  href: string;
  selected: boolean;
  label: string;
  count: number;
  n: (value: number) => string;
}) {
  // Nothing behind it and not already chosen: shown, but not a dead end.
  const empty = count === 0 && !selected;
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-[var(--dur-hover)]",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && (
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 6.2 5 8.5l4.5-5" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="tabular-nums text-[length:var(--text-xs)] text-muted-foreground">{n(count)}</span>
    </>
  );
  if (empty) {
    return (
      <span className="flex items-center gap-3 rounded-md px-2 py-1.5 text-muted-foreground/60" aria-disabled="true">
        {body}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      role="checkbox"
      aria-checked={selected}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-[var(--dur-hover)] hover:bg-muted",
        selected && "font-medium",
      )}
    >
      {body}
    </Link>
  );
}

/**
 * A range entered as two numbers. A dual slider looks newer and is worse
 * for this: the prices span 676 to 15,000, and a thumb moved a pixel is
 * forty pounds.
 */
function PriceRange({ query, bounds, params }: { query: ShopQuery; bounds: Props["priceBounds"]; params: ShopParams }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [min, setMin] = useState(query.priceMin?.toString() ?? "");
  const [max, setMax] = useState(query.priceMax?.toString() ?? "");
  const id = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let href = removeParams(params, ["min", "max"]);
    const withQuery = (h: string, key: string, value: string) => {
      const url = new URL(h, "http://x");
      url.searchParams.set(key, value);
      return `${url.pathname}${url.search}`;
    };
    if (min.trim()) href = withQuery(href, "min", min.trim());
    if (max.trim()) href = withQuery(href, "max", max.trim());
    router.push(href, { scroll: false });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          {t("priceMin")}
        </label>
        <input
          id={`${id}-min`}
          inputMode="numeric"
          dir="ltr"
          placeholder={String(bounds.min)}
          value={min}
          onChange={(event) => setMin(event.target.value.replace(/[^\d]/g, ""))}
          className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 tabular-nums"
        />
        <span className="text-muted-foreground" aria-hidden>
          –
        </span>
        <label htmlFor={`${id}-max`} className="sr-only">
          {t("priceMax")}
        </label>
        <input
          id={`${id}-max`}
          inputMode="numeric"
          dir="ltr"
          placeholder={String(bounds.max)}
          value={max}
          onChange={(event) => setMax(event.target.value.replace(/[^\d]/g, ""))}
          className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 tabular-nums"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md border border-border py-1.5 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary/60 active:scale-[0.99]"
      >
        {t("applyPrice")}
      </button>
    </form>
  );
}
