import { ClosingCta } from "@/components/closing-cta";
import ProductCard from "@/components/product-card/product-card";
import { SectionHeading } from "@/components/section-heading";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { ShopSort } from "@/components/shop/shop-sort";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { isOpenEndedQuery, parseShopQuery, searchShop } from "@/lib/shop.server";
import { clearFilters, removeParams, setParam, toggleParam, type ShopParams } from "@/lib/shop-url";
import { SearchX, XIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/editorial/page-header";
import { FamilyIntro } from "@/components/shop/family-intro";
import { pick } from "@/content/l10n";
import { FAMILY_INTRO, lightingType } from "@/content/lighting-types";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import type { Metadata } from "next";
import { Suspense } from "react";
import Loading from "@/app/[locale]/loading";
import { cacheTag } from "next/cache";
import { CARDS_TAG, CATALOGUE_TAG, catalogueCacheLife } from "@/lib/cache.server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const query = parseShopQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "shop" });
  // A single family is a page in its own right — its own title, its own
  // canonical. Every other combination of filters canonicalises to it or
  // to the whole shop, so a crawler does not index a page per checkbox.
  const family = query.families.length === 1 ? query.families[0]! : null;
  const type = family ? landingType(family, query.types) : undefined;
  if (family && type) {
    // One lighting type is what the old /category/<brand>/<family>/<type>
    // pages were, and what people search for — "flood lights", "كشافات
    // فلود لايت" — so it keeps a page of its own rather than folding into
    // the family.
    return constructMetadata({
      locale,
      path: `/products?family=${familySlug(family)}&type=${type.id}`,
      title: t("typeMetaTitle", { type: pick(type.search, locale) }),
      description: t("typeMetaDescription", {
        type: locale === "ar" ? pick(type.name, locale) : pick(type.name, locale).toLowerCase(),
        purpose: pick(type.purpose, locale),
      }),
    });
  }
  if (family) {
    const intro = FAMILY_INTRO[family];
    return constructMetadata({
      locale,
      path: `/products?family=${familySlug(family)}`,
      title: t("familyMetaTitle", { family: pick(intro.title, locale) }),
      description: pick(intro.body, locale).slice(0, 160),
    });
  }
  return constructMetadata({ locale, path: "/products", title: t("metaTitle"), description: t("metaDescription") });
}

/** The lighting type a family view is narrowed to, when it is exactly one the catalogue describes. */
function landingType(family: ProductFamily, types: string[]) {
  if (types.length !== 1) return undefined;
  const type = lightingType(types[0]);
  return type?.family === family ? type : undefined;
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
export default function ShopPage({ params, searchParams }: Props) {
  // The URL is read inside the boundary, so a link to the shop can prefetch
  // its shared shell (partialPrefetching); the shelf streams in after.
  return (
    <Suspense fallback={<Loading />}>
      <ShopForUrl params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ShopForUrl({ params, searchParams }: Props) {
  const locale = getLocaleFromParams(await params);
  const raw = shopParamsOnly(await searchParams);
  // Free text and price bounds can take any value: caching on them would
  // add a cache entry per visitor's search. Those render per request (over
  // the cached catalogue); every finite shelf is still cached.
  if (isOpenEndedQuery(parseShopQuery(raw))) return shopView(locale, raw);
  return <CachedShopView locale={locale} raw={raw} />;
}

/** Cards whose photos load eagerly: the first row at the widest grid (4 columns). */
const ABOVE_THE_FOLD = 4;

/** The query keys the shop reads. Anything else (utm_…, fbclid) is not part of the page. */
const SHOP_KEYS = ["family", "brand", "type", "sale", "min", "max", "sort", "q", "page"] as const;

function shopParamsOnly(raw: ShopParams): ShopParams {
  const kept: ShopParams = {};
  for (const key of SHOP_KEYS) if (raw[key] !== undefined) kept[key] = raw[key];
  return kept;
}

/**
 * The shop for one finite query, rendered once and cached (`"use cache"`
 * keys on its arguments). The search params make the page itself per
 * request, but a hundred visitors on the same shelf — the first page, a
 * family, a sort — now share one render instead of each paying for 24
 * cards and the facets. Tracking parameters are dropped first so they do
 * not split the cache.
 */
async function CachedShopView({ locale, raw }: { locale: string; raw: ShopParams }) {
  "use cache";
  cacheTag(CATALOGUE_TAG, CARDS_TAG);
  await catalogueCacheLife();
  return shopView(locale, raw);
}

/** The shop for one query — cached by CachedShopView, or per request for a search. */
async function shopView(locale: string, raw: ShopParams) {
  // A cache scope does not see the layout's setRequestLocale, and the
  // components below (useLocale in the product cards) would fall back to
  // reading the request headers — which a cached render may not do, so
  // every visit missed the cache and rendered from scratch.
  setRequestLocale(locale);
  const query = parseShopQuery(raw);
  const [t, tFamily, tNav, result] = await Promise.all([
    getTranslations({ locale, namespace: "shop" }),
    getTranslations({ locale, namespace: "family" }),
    getTranslations({ locale, namespace: "nav" }),
    searchShop(query, locale),
  ]);

  const family = query.families.length === 1 ? query.families[0]! : null;
  const type = family ? landingType(family, query.types) : undefined;

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
    <>
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-5 sm:px-6 md:pt-8 lg:px-10 lg:pb-16">
        <Breadcrumbs
          locale={locale}
          className="mb-3 md:mb-6"
          items={
            family && type
              ? [
                  { label: t("title"), href: "/products" },
                  { label: tFamily(family), href: `/products?family=${familySlug(family)}` },
                  { label: pick(type.name, locale) },
                ]
              : family
                ? [{ label: t("title"), href: "/products" }, { label: tFamily(family) }]
                : [{ label: t("title") }]
          }
        />
        <SectionHeading
          as="h1"
          eyebrow={type ? pick(FAMILY_INTRO[family!].title, locale) : family ? t("title") : undefined}
          title={type ? pick(type.search, locale) : family ? pick(FAMILY_INTRO[family].title, locale) : t("heading")}
          subtitle={t("count", { count: result.total, formatted: formatNumber(result.total, locale === "ar" ? "ar" : "en") })}
          subtitleLive
          // Below lg the sort sits beside the filter button in the sticky
          // toolbar (ShopFilters); here it is the desktop's.
          action={
            <div className="hidden lg:block">
              <ShopSort value={query.sort} params={raw} />
            </div>
          }
          // A phone's first screen is for products: the page title one step
          // down the scale there, the desktop's unchanged.
          className="mb-0 border-b border-border pb-4 md:pb-6 lg:mb-0 max-md:[&_h1]:text-[length:var(--text-2xl)]"
        />

        {family && (
          <FamilyIntro family={family} locale={locale} params={raw} typeFacets={result.facets.type} activeTypes={query.types} />
        )}

        {chips.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2 pt-4 md:pt-5" aria-label={t("activeFilters")}>
            {chips.map((chip) => (
              <li key={chip.href + chip.label}>
                <Link
                  href={chip.href}
                  scroll={false}
                  className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card pe-2.5 ps-3 text-[length:var(--text-sm)] transition-colors duration-[var(--dur-hover)] ease-[var(--ease-out)] hover:border-primary/60 sm:min-h-8"
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
                className="inline-flex min-h-10 items-center px-1 text-[length:var(--text-sm)] font-medium text-muted-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline sm:min-h-8"
              >
                {t("clearAll")}
              </Link>
            </li>
          </ul>
        )}

        <div className="grid gap-x-10 pt-3 md:pt-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:pt-8">
          <ShopFilters query={query} facets={result.facets} priceBounds={result.priceBounds} params={raw} />

          <section aria-label={t("results")}>
            {result.products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-20 text-center">
                <SearchX className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <p className="text-[length:var(--text-lg)] font-medium">{t("emptyTitle")}</p>
                <p className="max-w-sm text-pretty text-muted-foreground">{t("emptyBody")}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={clearFilters(raw)}
                    className="inline-flex min-h-10 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-[background-color,transform] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
                  >
                    {t("clearAll")}
                  </Link>
                  {/* A way out that is not another filter: the whole catalogue. */}
                  <Link
                    href="/products"
                    className="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-5 font-medium transition-[border-color,transform] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:border-primary/60 active:scale-[0.98]"
                  >
                    {tNav("allProducts")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
                  {result.products.map((product, index) => (
                    <li key={product.id}>
                      {/* The first row on any width (2 on a phone, up to 4 on
                          a wide screen) is above the fold: load it now. */}
                      <ProductCard product={product} locale={locale} eager={index < ABOVE_THE_FOLD} />
                    </li>
                  ))}
                </ul>
                <ShopPagination
                  page={result.page}
                  pageCount={result.pageCount}
                  params={raw}
                  locale={locale}
                />
              </>
            )}
          </section>
        </div>
      </div>
      {/* The end of the shelf is not a dead end: a person to ask. */}
      <ClosingCta locale={locale} />
    </>
  );
}
