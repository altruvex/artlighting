import ProductCard from "@/components/product-card/product-card";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopSort } from "@/components/shop/shop-sort";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { parseShopQuery, searchShop } from "@/lib/shop.server";
import { clearFilters, removeParams, setParam, toggleParam, type ShopParams } from "@/lib/shop-url";
import { XIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "shop" });
  return constructMetadata({ title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * Every product, in one place.
 *
 * The storefront had no page like this: a shopper reached a product only
 * down brand → family → lighting type → product, with no way to see every
 * chandelier at once, everything on sale, or anything by price. The
 * funnel still exists for people who browse that way; this is for the ones
 * who know what they want.
 */
export default async function ShopPage({ params, searchParams }: Props) {
  const locale = getLocaleFromParams(await params);
  const raw = await searchParams;
  const query = parseShopQuery(raw);
  const [t, tFamily, result] = await Promise.all([
    getTranslations({ locale, namespace: "shop" }),
    getTranslations({ locale, namespace: "family" }),
    searchShop(query, locale),
  ]);

  const brandLabel = (value: string) => (value === "balcom" ? t("brand.balcom") : t("brand.misterLed"));

  // What is currently narrowing the list, each removable on its own.
  const chips = [
    ...query.families.map((family) => ({
      label: tFamily(family),
      href: toggleParam(raw, "family", family.toLowerCase()),
    })),
    ...query.brands.map((brand) => ({ label: brandLabel(brand), href: toggleParam(raw, "brand", brand) })),
    ...query.types.map((type) => ({
      label: result.facets.type.find((f) => f.value === type)?.label ?? type,
      href: toggleParam(raw, "type", type),
    })),
    ...(query.onSale ? [{ label: t("onSale"), href: setParam(raw, "sale", null) }] : []),
    ...(query.priceMin !== null || query.priceMax !== null
      ? [{ label: t("priceChip"), href: removeParams(raw, ["min", "max"]) }]
      : []),
    ...(query.q ? [{ label: `“${query.q}”`, href: setParam(raw, "q", null) }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[length:var(--text-3xl)]">{t("title")}</h1>
          <p className="text-[length:var(--text-sm)] text-muted-foreground" aria-live="polite">
            {t("count", { count: result.total, formatted: formatNumber(result.total, locale === "ar" ? "ar" : "en") })}
          </p>
        </div>
        <ShopSort value={query.sort} params={raw} />
      </header>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2 pt-5" aria-label={t("activeFilters")}>
          {chips.map((chip) => (
            <li key={chip.href + chip.label}>
              <Link
                href={chip.href}
                scroll={false}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pe-2 ps-3 text-[length:var(--text-sm)] transition-colors duration-[var(--dur-hover)] hover:border-primary/60"
              >
                {chip.label}
                <XIcon className="size-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden />
                <span className="sr-only">{t("remove")}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={clearFilters(raw)}
              scroll={false}
              className="text-[length:var(--text-sm)] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("clearAll")}
            </Link>
          </li>
        </ul>
      )}

      <div className="grid gap-x-10 pt-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ShopFilters query={query} facets={result.facets} priceBounds={result.priceBounds} params={raw} />

        <section aria-label={t("results")}>
          {result.products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-20 text-center">
              <p className="text-[length:var(--text-lg)] font-medium">{t("emptyTitle")}</p>
              <p className="max-w-sm text-muted-foreground">{t("emptyBody")}</p>
              <Link
                href={clearFilters(raw)}
                className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-transform duration-[var(--dur-press)] active:scale-[0.98]"
              >
                {t("clearAll")}
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
              {result.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
