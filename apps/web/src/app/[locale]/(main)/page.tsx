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

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  return constructMetadata({ locale, path: "/" });
}

// `homeData` feeds nearly every section below (tiles, all three rails), so
// there's no shared part worth prefetching — this page blocks instead.
export const instant = false;

/**
 * The home page: the company, then the catalogue.
 *
 * It had been turned into a shop front — offer, categories, three rails —
 * which sold products well and said nothing about who was selling them. The
 * order now follows how a professional customer weighs a supplier, and how
 * a homeowner who is unsure starts: who this is, what they are trying to
 * light, how the company helps, and then the catalogue, with the same
 * rails, offers and recently viewed products as before. Projects are the
 * proof; the guide is what makes the company sound like it knows light.
 */
export default async function MainPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "home.rails" }), homeData(locale)]);
  const productCount = data.families.reduce((sum, family) => sum + family.count, 0);
  // With nothing flagged as featured, "featured" falls back to the newest
  // rows — and two rails of the same ten products read as a mistake. Each
  // rail shows only what the one above it has not.
  const featuredIds = new Set(data.featured.map((card) => card.id));
  const newest = data.newest.filter((card) => !featuredIds.has(card.id));

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
      <HomeHero locale={locale} productCount={productCount} />
      <Positioning locale={locale} />
      <ApplicationsIndex locale={locale} />
      <ServicesOverview locale={locale} />
      <CategoryTiles locale={locale} families={data.families} />
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
        products={newest}
        locale={locale}
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
      {/* Below the fold on purpose: it is filled in from this browser's
          history after the page arrives, and anything it pushes down should
          already be out of view. */}
      <RecentlyViewed locale={locale} />
      <ProjectsSection locale={locale} />
      <GuideTeaser locale={locale} />
      <ClosingCta locale={locale} />
    </>
  );
}
