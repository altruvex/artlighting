import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb"
import { auth } from "@/lib/auth-server";
import { readGuestToken } from "@/lib/guest-token";
import ProductRouter from "@/components/product-router"
import { ProductRail } from "@/components/home/product-rail"
import { relatedCards } from "@/lib/shop.server"
import { formatNumber } from "@/lib/numbers"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { constructMetadata } from "@/lib/metadata"
import { ProductService } from "@/lib/services/product.service"
import { PagePropsTypes } from "@/types"
import { Metadata } from "next"
import { familyFromSlug, familySlug } from "@repo/catalog"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Page({ params }: PagePropsTypes) {
  const awaitedParams = await params
  const subCategory = awaitedParams.subCategory as string
  const lightingType = awaitedParams.lightingType as string
  const ProductId = awaitedParams.ProductId as string
  const locale = getLocaleFromParams(awaitedParams)

  if (!subCategory || !lightingType || !ProductId) notFound()

  // The URL segment is a slug; the column is an enum. An unknown section
  // 404s here rather than becoming a query for a value that cannot exist.
  const family = familyFromSlug(subCategory)
  if (!family) notFound()

  const product = await ProductService.getLocalizedProductDetail(ProductId, locale, {
    sectionType: family,
    spotlightType: lightingType,
    brand: "balcom",
    isActive: true,
  })

  if (!product) notFound()

  const [configuration, related, t] = await Promise.all([
    ProductService.getOrCreateConfiguration(product, (await auth()).userId, await readGuestToken()),
    // The same cards the shop and the home page render, rather than a card
    // shape assembled here field by field.
    relatedCards({ productId: product.productId, family, lightingTypeSlug: product.spotlightType }, locale),
    getTranslations({ locale, namespace: "home.rails" }),
  ])

  return (
    <>
      <Breadcrumb />
      <ProductRouter product={product} configuration={configuration} locale={locale} />
      <ProductRail
        title={t("related")}
        href={`/products?family=${familySlug(family)}`}
        hrefLabel={t("relatedLink")}
        products={related}
        locale={locale}
      />
    </>
  )
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const awaitedParams = await params
  const subCategory = awaitedParams.subCategory as string
  const lightingType = awaitedParams.lightingType as string
  const ProductId = awaitedParams.ProductId as string
  const locale = getLocaleFromParams(awaitedParams)

  const family = familyFromSlug(subCategory)
  if (!subCategory || !lightingType || !ProductId || !family) {
    return constructMetadata({
      title: locale === "ar" ? "المنتج غير موجود" : "Product Not Found",
      description: "",
    })
  }

  const product = await ProductService.getLocalizedProductDetail(ProductId, locale, {
    sectionType: family,
    spotlightType: lightingType,
  })

  if (!product) {
    return constructMetadata({
      title: locale === "ar" ? "المنتج غير موجود" : "Product Not Found",
      description: locale === "ar"
        ? "لم يتم العثور على المنتج المطلوب."
        : "The requested product could not be found.",
    })
  }

  // The URL segment is a slug; a title is copy. Interpolating the slug put
  // a bare English "indoor" in the middle of the Arabic title.
  const tFamily = await getTranslations("family")
  const familyName = tFamily(family)

  const specs = product.localizedSpecs
  // From the structured specs through the service, not the legacy
  // per-language string: two products carry an Arabic "٠" where the English
  // row has the real figure, and this title read the Arabic one. Absent when
  // nothing is stored, rather than the invented "15W" that used to stand in.
  const wattage = product.maximumWattage
  const wattsEn = wattage ? `${formatNumber(wattage, "en")}W ` : ""
  const wattsAr = wattage ? `${formatNumber(wattage, "ar")} وات ` : ""
  const isOutdoor = product.maxIP && product.maxIP >= 65
  const localizedCategory = product.category?.translations?.[0]?.name ?? product.category?.name ?? ""
  const localizedLightingType = product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? ""

  const titles = {
    en: `${product.productName} - ${wattsEn}${familyName} ${localizedLightingType} | Balcom Lighting`,
    ar: `${product.productName} - ${wattsAr}${familyName} ${localizedLightingType} | إضاءة بالكوم`,
  }

  const descriptions = {
    en: `Discover the ${product.productName}, a professional ${wattsEn}${familyName.toLowerCase()} ${localizedLightingType.toLowerCase()} perfect for ${localizedCategory.toLowerCase()} applications.${isOutdoor ? ` IP${product.maxIP} rated for outdoor use.` : ""} ${specs?.colorTemperature || "Adjustable color temperature"}${specs?.cri ? `, CRI ${specs.cri}` : ""}. ${specs?.luminousFlux || "High brightness"} lumens by Balcom!`,
    ar: `اكتشف ${product.productName}، كشاف احترافي ${wattsAr}${familyName} ${localizedLightingType.toLowerCase()} مثالي لـ ${localizedCategory.toLowerCase()}.${isOutdoor ? ` تصنيف IP${product.maxIP} للاستخدام الخارجي.` : ""} ${specs?.colorTemperature || "درجة حرارة لون قابلة للتعديل"}. حلول إضاءة احترافية من بالكوم!`,
  }

  return constructMetadata({
    title: titles[locale as keyof typeof titles],
    description: descriptions[locale as keyof typeof descriptions],
    image: product.productImages[0] ?? undefined,
  })
}