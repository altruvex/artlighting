import { CategoryTiles } from "@/components/home/category-tiles";
import { HomeHero } from "@/components/home/home-hero";
import { ProductRail } from "@/components/home/product-rail";
import { TrustStrip } from "@/components/home/trust-strip";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { activePromotions, byStrength } from "@/lib/promotions.server";
import { homeData } from "@/lib/shop.server";
import { PagePropsTypes } from "@/types";
import { getTranslations } from "next-intl/server";
import ProjectsSection from "./(pages)/projects/project-section";

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
 * and the installed projects as proof. Every product rail reads the same
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
        title={t("sale")}
        subtitle={t("saleSub")}
        href="/products?sale=1&sort=discount"
        hrefLabel={t("saleLink")}
        products={data.onSale}
        locale={locale}
      />
      <TrustStrip locale={locale} />
      <ProductRail
        title={t("featured")}
        subtitle={t("featuredSub")}
        href="/products"
        hrefLabel={t("featuredLink")}
        products={data.featured}
        locale={locale}
      />
      <ProductRail
        title={t("newest")}
        href="/products?sort=newest"
        hrefLabel={t("newestLink")}
        products={data.newest}
        locale={locale}
      />
      <ProjectsSection params={params} />
    </>
  );
}
