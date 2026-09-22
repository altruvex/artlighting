import { ClosingCta } from "@/components/closing-cta";
import { CategoryTiles } from "@/components/home/category-tiles";
import { HomeHero } from "@/components/home/home-hero";
import { ProductRail } from "@/components/home/product-rail";
import { ProjectsSection } from "@/components/home/projects-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { activePromotions, byStrength } from "@/lib/promotions.server";
import { homeData } from "@/lib/shop.server";
import { PagePropsTypes } from "@/types";
import { getTranslations } from "next-intl/server";

/**
 * The home page, as a shop.
 *
 * It was a brochure: eight sections — a street-lamp carousel, a new
 * collection teaser, about us, "illuminate your vision", our brands, our
 * projects, bestsellers, and a closing call to action — and the one that
 * sold anything was seventh. About us and the brand story are still on the
 * site, on the about page, where someone looking for them goes.
 *
 * Now it leads with the shop, the live offer and the three ways in; then
 * what is on sale, what the showroom features, the promises, what is new,
 * the shopper's own recently viewed products, the installed projects as
 * proof, and a person to talk to. Every product rail reads the same
 * rows the shop does.
 */
export default async function MainPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const [t, data, promotions] = await Promise.all([
    getTranslations({ locale, namespace: "home.rails" }),
    homeData(locale),
    activePromotions().then(byStrength),
  ]);

  return (
    <>
      <HomeHero locale={locale} promotion={promotions[0] ?? null} />
      <CategoryTiles locale={locale} families={data.families} />
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
      <ProjectsSection locale={locale} />
      <ClosingCta locale={locale} />
    </>
  );
}
