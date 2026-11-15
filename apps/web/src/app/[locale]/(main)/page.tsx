import { ClosingCta } from "@/components/closing-cta";
import { JsonLd } from "@/components/editorial/json-ld";
import { ApplicationsIndex } from "@/components/home/applications-index";
import { CategoryTiles } from "@/components/home/category-tiles";
import { GuideTeaser } from "@/components/home/guide-teaser";
import { HomeHero } from "@/components/home/home-hero";
import { Positioning } from "@/components/home/positioning";
import { ProductRail } from "@/components/home/product-rail";
import { ProjectsSection } from "@/components/home/projects-section";
import { ServicesOverview } from "@/components/home/services-overview";
import { TrustStrip } from "@/components/home/trust-strip";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { homeData } from "@/lib/shop.server";
import { absoluteUrl } from "@/lib/site";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  return constructMetadata({ locale, path: "/" });
}

// `homeData` feeds nearly every section below (tiles, all three rails), so
// there's no shared part worth prefetching — this page blocks instead.
export const instant = false;

/**
 * The home page: the catalogue first, then the company.
 *
 * A company-first order put about four screens of text before the first
 * price. Now the hero leads into the three families and the offers, then
 * the trust points, featured and new products; who the company is, what it
 * has lit and how it helps follow for the visitor who keeps reading.
 */
export default async function MainPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "home.rails" }),
    homeData(locale),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: locale === "ar" ? "آرت لايتنج" : "Art Lighting",
          url: absoluteUrl(locale, "/"),
          inLanguage: locale,
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl(locale, "/products")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <HomeHero locale={locale} />
      <CategoryTiles
        locale={locale}
        families={data.families}
        types={data.types}
      />
      <ProductRail
        id="sale"
        title={t("sale")}
        subtitle={t("saleSub")}
        href="/products?sale=1&sort=discount"
        hrefLabel={t("saleLink")}
        products={data.onSale}
        locale={locale}
      />
      <TrustStrip locale={locale} />
      <ProductRail
        id="featured"
        title={t("featured")}
        subtitle={t("featuredSub")}
        href="/products"
        hrefLabel={t("featuredLink")}
        products={data.featured}
        locale={locale}
      />
      <ProductRail
        id="newest"
        title={t("newest")}
        href="/products?sort=newest"
        hrefLabel={t("newestLink")}
        products={data.newest}
        locale={locale}
      />
      {/* Below the fold on purpose: it is filled in from this browser's
          history after the page arrives, and anything it pushes down should
          already be out of view. */}
      <RecentlyViewed locale={locale} />
      <ApplicationsIndex locale={locale} />
      <ProjectsSection locale={locale} />
      <ServicesOverview locale={locale} />
      <Positioning locale={locale} />
      <GuideTeaser locale={locale} />
      <ClosingCta locale={locale} />
    </>
  );
}
