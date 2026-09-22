import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { ClosingCta } from "@/components/closing-cta";
import { ProductRail } from "@/components/home/product-rail";
import { RecentlyViewed } from "@/components/recently-viewed";
import { auth } from "@/lib/auth-server";
import { readGuestToken } from "@/lib/guest-token";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { ProductService } from "@/lib/services/product.service";
import { productReviewsSection } from "@/lib/reviews.server";
import { relatedCards } from "@/lib/shop.server";
import type { PagePropsTypes } from "@/types";
import { familyFromSlug, familySlug } from "@repo/catalog";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import ProductDetail from "./product-detail";

export type Brand = "balcom" | "mister-led";

const BRAND = {
  balcom: { en: "Balcom Lighting", ar: "إضاءة بالكوم", icon: undefined, noun: { en: "spotlight", ar: "كشاف" } },
  "mister-led": { en: "Mister LED Lighting", ar: "إضاءة مستر ليد", icon: "/misterled.ico", noun: { en: "fitting", ar: "وحدة إضاءة" } },
} as const;

/** The route's three segments, checked; null for anything that cannot be a product. */
async function routeOf(params: PagePropsTypes["params"]) {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const subCategory = awaited.subCategory as string | undefined;
  const lightingType = awaited.lightingType as string | undefined;
  const productId = awaited.ProductId as string | undefined;
  // The URL segment is a slug; the column is an enum. An unknown section
  // 404s here rather than becoming a query for a value that cannot exist.
  const family = subCategory ? familyFromSlug(subCategory) : null;
  if (!lightingType || !productId || !family) return { locale, route: null };
  return { locale, route: { family, lightingType, productId } };
}

/**
 * The product page, for either brand's URL.
 *
 * Each brand had its own page.tsx, identical but for the brand string and
 * a title suffix; both now render through this.
 */
export async function ProductPage({ params, brand }: { params: PagePropsTypes["params"]; brand: Brand }) {
  const { locale, route } = await routeOf(params);
  if (!route) notFound();

  const product = await ProductService.getLocalizedProductDetail(route.productId, locale, {
    sectionType: route.family,
    spotlightType: route.lightingType,
    brand,
    isActive: true,
  });
  if (!product) notFound();

  const [{ userId }, guestToken] = await Promise.all([auth(), readGuestToken()]);
  const [configuration, related, t, reviews] = await Promise.all([
    ProductService.getOrCreateConfiguration(product, userId, guestToken),
    // The same cards the shop and the home page render.
    relatedCards({ productId: product.productId, family: route.family, lightingTypeSlug: product.spotlightType }, locale),
    getTranslations({ locale, namespace: "home.rails" }),
    productReviewsSection(product.productId, locale, userId),
  ]);

  return (
    <>
      <Breadcrumb />
      <ProductDetail product={product} configuration={configuration} locale={locale} reviews={reviews} signedIn={Boolean(userId)} />
      <ProductRail
        id="related"
        title={t("related")}
        href={`/products?family=${familySlug(route.family)}`}
        hrefLabel={t("relatedLink")}
        products={related}
        locale={locale}
      />
      <RecentlyViewed locale={locale} exclude={product.productId} />
      <ClosingCta locale={locale} />
    </>
  );
}

export async function productPageMetadata({
  params,
  brand,
}: {
  params: PagePropsTypes["params"];
  brand: Brand;
}): Promise<Metadata> {
  const { locale, route } = await routeOf(params);
  const ar = locale === "ar";
  const icons = BRAND[brand].icon;
  const product = route
    ? await ProductService.getLocalizedProductDetail(route.productId, locale, {
        sectionType: route.family,
        spotlightType: route.lightingType,
        brand,
      })
    : null;

  if (!route || !product) {
    return constructMetadata({
      title: ar ? "المنتج غير موجود" : "Product not found",
      description: ar ? "لم يتم العثور على المنتج المطلوب." : "The requested product could not be found.",
      icons,
    });
  }

  const familyName = (await getTranslations({ locale, namespace: "family" }))(route.family);
  const specs = product.localizedSpecs;
  // From the structured specs through the service, not the legacy
  // per-language string. Absent when nothing is stored.
  const wattage = product.maximumWattage;
  const watts = wattage ? (ar ? `${formatNumber(wattage, "ar")} وات ` : `${formatNumber(wattage, "en")}W `) : "";
  const lightingTypeName = product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? "";
  const categoryName = product.category?.translations?.[0]?.name ?? product.category?.name ?? "";
  const outdoor = product.maxIP && product.maxIP >= 65;
  const suffix = BRAND[brand][ar ? "ar" : "en"];

  const title = `${product.productName} - ${watts}${familyName} ${lightingTypeName} | ${suffix}`;
  const description = ar
    ? `اكتشف ${product.productName}، ${BRAND[brand].noun.ar} ${watts}${familyName} ${lightingTypeName} مناسب لـ${categoryName}.${outdoor ? ` تصنيف IP${product.maxIP} للاستخدام الخارجي.` : ""}${specs?.colorTemperature ? ` ${specs.colorTemperature}.` : ""}`
    : `The ${product.productName}, a ${watts}${familyName.toLowerCase()} ${lightingTypeName.toLowerCase()} ${BRAND[brand].noun.en} for ${categoryName.toLowerCase()}.${outdoor ? ` IP${product.maxIP} rated for outdoor use.` : ""}${specs?.colorTemperature ? ` ${specs.colorTemperature}.` : ""}${specs?.cri ? ` CRI ${specs.cri}.` : ""}`;

  return constructMetadata({
    title,
    description: description.replace(/\s+/g, " ").trim(),
    image: product.productImages[0] ?? undefined,
    icons,
  });
}
