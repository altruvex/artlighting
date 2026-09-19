import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb"
import { auth } from "@/lib/auth-server";
import ProductRouter from "@/components/product-router"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { constructMetadata } from "@/lib/metadata"
import { ProductService } from "@/lib/services/product.service"
import { PagePropsTypes } from "@/types"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Page({ params }: PagePropsTypes) {
  const awaitedParams = await params
  const subCategory = awaitedParams.subCategory as string
  const lightingType = awaitedParams.lightingType as string
  const ProductId = awaitedParams.ProductId as string
  const locale = getLocaleFromParams(awaitedParams)

  if (!subCategory || !lightingType || !ProductId) notFound()

  const product = await ProductService.getLocalizedProductDetail(ProductId, locale, {
    sectionType: subCategory,
    spotlightType: lightingType,
    brand: "balcom",
    isActive: true,
  })

  if (!product) notFound()

  const [configuration, relatedProducts] = await Promise.all([
    ProductService.getOrCreateConfiguration(product, (await auth()).userId),
    ProductService.getRelatedProducts(product.productId, "balcom", subCategory, locale, {
      spotlightType: product.spotlightType,
      maxIP: product.maxIP ?? undefined,
    }),
  ])

  return (
    <>
      <Breadcrumb />
      <ProductRouter
        product={product as any}
        relatedProducts={relatedProducts as any}
        configuration={configuration as any}
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

  if (!subCategory || !lightingType || !ProductId) {
    return constructMetadata({
      title: locale === "ar" ? "المنتج غير موجود" : "Product Not Found",
      description: "",
    })
  }

  const product = await ProductService.getLocalizedProductDetail(ProductId, locale, {
    sectionType: subCategory,
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

  const specs = product.localizedSpecs
  const wattage = specs?.maximumWattage || "15"
  const isOutdoor = product.maxIP && product.maxIP >= 65
  const localizedCategory = product.category?.translations?.[0]?.name ?? product.category?.name ?? ""
  const localizedLightingType = product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? ""

  const titles = {
    en: `${product.productName} - ${wattage}W ${subCategory} ${localizedLightingType} | ${product.brand} Lighting`,
    ar: `${product.productName} - ${wattage} وات ${subCategory} ${localizedLightingType} | إضاءة ${product.brand}`,
  }

  const descriptions = {
    en: `Discover the ${product.productName}, a professional ${wattage}W ${subCategory} ${localizedLightingType.toLowerCase()} perfect for ${localizedCategory.toLowerCase()} applications.${isOutdoor ? ` IP${product.maxIP} rated for outdoor use.` : ""} ${specs?.colorTemperature || "Adjustable color temperature"}${specs?.cri ? `, CRI ${specs.cri}` : ""}. ${specs?.luminousFlux || "High brightness"} lumens by ${product.brand}!`,
    ar: `اكتشف ${product.productName}، كشاف احترافي ${wattage} وات ${subCategory} ${localizedLightingType.toLowerCase()} مثالي لـ ${localizedCategory.toLowerCase()}.${isOutdoor ? ` تصنيف IP${product.maxIP} للاستخدام الخارجي.` : ""} ${specs?.colorTemperature || "درجة حرارة لون قابلة للتعديل"}. حلول إضاءة احترافية من ${product.brand}!`,
  }

  return constructMetadata({
    title: titles[locale as keyof typeof titles],
    description: descriptions[locale as keyof typeof descriptions],
    image: product.productImages[0] ?? undefined,
  })
}