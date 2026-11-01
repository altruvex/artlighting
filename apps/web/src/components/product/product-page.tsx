import { ClosingCta } from "@/components/closing-cta";
import { JsonLd } from "@/components/editorial/json-ld";
import { Breadcrumbs } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { absoluteUrl, assetUrl, ORGANIZATION_ID } from "@/lib/site";
import { applyRate, serializeMoney, subtractMoney } from "@repo/money";
import { ProductContext } from "./product-context";
import { ProductRail } from "@/components/home/product-rail";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { BRANDS } from "@/lib/company";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { ProductService, productView } from "@/lib/services/product.service";
import { specNumbersByKey, specsByKey } from "@/lib/spec-groups";
import { productReviewsSection } from "@/lib/reviews.server";
import { catalogueCards, relatedCards } from "@/lib/shop.server";
import type { PagePropsTypes } from "@/types";
import { familyFromSlug, familySlug } from "@repo/catalog";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import ProductDetail from "./product-detail";

export type Brand = "balcom" | "mister-led";

const BRAND = {
  balcom: { name: { en: "Balcom", ar: "بالكوم" }, icon: undefined },
  "mister-led": { name: { en: "Mister LED", ar: "مستر ليد" }, icon: "/misterled.ico" },
} as const;

/**
 * Every active product of a brand, as its route params — so each product
 * page is prerendered at build. One added later is served its shell on the
 * first visit and prerendered then (partialPrefetching in next.config.ts).
 */
export async function productStaticParams(brand: Brand) {
  const cards = await catalogueCards("en");
  return cards
    .filter((card) => card.brand === brand)
    .map((card) => ({
      subCategory: familySlug(card.sectionType as Parameters<typeof familySlug>[0]),
      lightingType: card.spotlightType.toLowerCase(),
      ProductId: card.productId.toLowerCase(),
    }));
}

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

  const [related, t, reviews, tFamily, tShop] = await Promise.all([
    // The same cards the shop and the home page render.
    relatedCards({ productId: product.productId, family: route.family, lightingTypeSlug: product.spotlightType }, locale),
    getTranslations({ locale, namespace: "home.rails" }),
    // Everyone's view of the reviews; the viewer's own row is marked
    // client-side from `personal`.
    productReviewsSection(product.productId, locale, null, 1, product.id),
    getTranslations({ locale, namespace: "family" }),
    getTranslations({ locale, namespace: "shop" }),
  ]);

  const path = `/category/${brand}/${familySlug(route.family)}/${route.lightingType}/${product.productId.toLowerCase()}`;
  const lightingTypeName = product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? route.lightingType;
  const effectivePrice = serializeMoney(subtractMoney(product.price, applyRate(product.price, product.discount)));
  const { colorTemperature, cri } = specsByKey(product.specGroups);
  const { maximumWattage } = specNumbersByKey(product.specGroups);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.productName,
          sku: product.productId.toUpperCase(),
          mpn: product.productId.toUpperCase(),
          brand: { "@type": "Brand", name: brand === "balcom" ? "Balcom" : "Mister LED" },
          category: `${tFamily(route.family)} / ${lightingTypeName}`,
          image: product.productImages.slice(0, 4).map(assetUrl),
          url: absoluteUrl(locale, path),
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            price: effectivePrice,
            url: absoluteUrl(locale, path),
            availability: product.quantity === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": ORGANIZATION_ID },
          },
          // The figures a buyer compares fittings by, as data a search or
          // answer engine can quote without parsing the page.
          additionalProperty: [
            maximumWattage && { "@type": "PropertyValue", name: "Power", value: maximumWattage, unitCode: "WTT" },
            product.maxIP && { "@type": "PropertyValue", name: "IP rating", value: `IP${product.maxIP}` },
            colorTemperature && { "@type": "PropertyValue", name: "Colour temperature", value: colorTemperature },
            cri && { "@type": "PropertyValue", name: "CRI", value: cri },
          ].filter(Boolean),
          ...(product.ratingCount > 0 && product.ratingAverage !== null
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAverage.toFixed(1), reviewCount: product.ratingCount } }
            : {}),
        }}
      />
      <div className={`${SECTION_FRAME} pt-6`}>
        <Breadcrumbs
          locale={locale}
          items={[
            { label: tShop("title"), href: "/products" },
            { label: tFamily(route.family), href: `/products?family=${familySlug(route.family)}` },
            { label: lightingTypeName, href: `/products?family=${familySlug(route.family)}&type=${route.lightingType}` },
            { label: product.productId.toUpperCase() },
          ]}
        />
      </div>
      {/* The same for every visitor, so the page is fully prerendered; who is
          looking is asked for by the browser (ProductDetail). */}
      {/* Only the fields the client tree renders; the rest stays server-side. */}
      <ProductDetail product={productView(product)} locale={locale} reviews={reviews} />
      <ProductContext
        locale={locale}
        productId={product.productId}
        productName={product.productName}
        family={route.family}
        typeSlug={route.lightingType}
        specSheetUrl={product.specSheetUrl}
      />
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

  // From the structured specs through the service, not the legacy
  // per-language strings. Absent when nothing is stored.
  const { colorTemperature, cri } = specsByKey(product.specGroups);
  const wattage = specNumbersByKey(product.specGroups).maximumWattage;
  const watts = wattage ? (ar ? `${formatNumber(wattage, "ar")} وات ` : `${formatNumber(wattage, "en")}W `) : "";
  const lightingTypeName = product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? "";
  const outdoor = product.maxIP && product.maxIP >= 65;
  const brandName = BRAND[brand].name[ar ? "ar" : "en"];
  // Fittings are searched for as "LED …" / "… ليد"; a chandelier's type
  // name is its model series, which "LED" would only garble.
  const led = route.family === "CHANDELIER" ? "" : ar ? " ليد" : "LED ";
  const type = ar ? `${lightingTypeName}${led}` : `${led}${lightingTypeName}`;
  const agent = BRANDS.find((entry) => entry.id === brand)?.sole
    ? ar
      ? ` من آرت لايتنج، الوكيل الوحيد لـ${brandName} في مصر.`
      : ` From Art Lighting, ${brandName}'s sole agent in Egypt.`
    : ar
      ? " من آرت لايتنج في القاهرة."
      : " From Art Lighting, Cairo.";

  // The model code first — it is what a contractor searches for — then
  // what the thing is, in the words it is searched with.
  const title = ar
    ? `${product.productName} — ${type} ${watts}| ${brandName} · آرت لايتنج`
    : `${product.productName} — ${watts}${type} | ${brandName} · Art Lighting`;
  // IP65 on an indoor fitting is a wet-room rating, not an outdoor one.
  const ip = product.maxIP
    ? route.family === "OUTDOOR" && outdoor
      ? ar ? ` حماية IP${product.maxIP} للاستخدام الخارجي.` : ` IP${product.maxIP} rated for outdoor use.`
      : ` IP${product.maxIP}.`
    : "";
  const description = ar
    ? `${product.productName}: ${type} ${watts}من ${brandName}.${ip}${colorTemperature ? ` ${colorTemperature}.` : ""}${cri ? ` CRI ${cri}.` : ""} السعر بالجنيه والتوصيل في مصر${agent}`
    : `${product.productName}: ${watts}${type.toLowerCase()} by ${brandName}.${ip}${colorTemperature ? ` ${colorTemperature}.` : ""}${cri ? ` CRI ${cri}.` : ""} Price in EGP, delivery in Egypt.${agent}`;

  return constructMetadata({
    locale,
    path: `/category/${brand}/${familySlug(route.family)}/${route.lightingType}/${product.productId.toLowerCase()}`,
    title,
    description: description.replace(/\s+/g, " ").trim(),
    image: product.productImages[0] ?? undefined,
    icons,
  });
}
