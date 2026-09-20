import { getLocaleFromParams } from "@/lib/i18n/utils"
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { serializeMoney, serializeRate } from "@repo/money"
import { serializeRowMoney } from "@/lib/serialize-money"
import { constructMetadata } from "@/lib/metadata"
import { PagePropsTypes } from "@/types"
import type {
  Configuration,
  OrderStatus,
  Product,
  ProductIP,
  ProductSpecification,
  ProductTranslation,
  SupportedCurrency,
  SupportedLanguage,
} from "@/types/products"
import { prisma } from "@repo/database"
import { Metadata } from "next"
import { getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import Complete, { type OrderWithRelations } from "./complete"

const Page = async ({ searchParams }: PagePropsTypes) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const orderId = resolvedSearchParams?.orderId

  if (!orderId || typeof orderId !== "string") {
    return notFound()
  }

  const locale = await getLocale()

  const order = await prisma.order.findUnique({
    where: { id: Number.parseInt(orderId, 10) },
    include: {
      shippingAddress: true,
      product: {
        include: {
          images: productImageSelect(),
          specifications: {
            where: {
              language: locale,
            },
          },
          translations: {
            where: {
              language: locale,
            },
          },
        },
      },
      user: true,
      configuration: true,
    },
  })

  if (!order) {
    return notFound()
  }

  const localizedProductName =
    order.product.translations[0]?.name || order.product.productName

  const localizedSpecifications: ProductSpecification[] = order.product.specifications.map(spec => ({
    ...spec,
    maximumWattage:
      spec.maximumWattage !== null && spec.maximumWattage !== undefined
        ? Number(spec.maximumWattage)
        : undefined,
    customSpecs: spec.customSpecs as Record<string, any> | undefined,
  }))

  const localizedTranslations: ProductTranslation[] = order.product.translations.map(trans => ({
    id: trans.id,
    productId: trans.productId,
    language: trans.language as SupportedLanguage,
    name: trans.name,
    description: trans.description ?? undefined,
    createdAt: trans.createdAt,
    updatedAt: trans.updatedAt,
  }))

  // Money crosses to the client as strings (see lib/serialize-money.ts).
  const orderDiscount = serializeRate(order.configuration?.discount ?? order.discountRate ?? 0)

  const localizedConfiguration: Configuration | null = order.configuration
    ? {
        id: order.configuration.id,
        productId: order.configuration.productId,
        configPrice: serializeMoney(order.configuration.configPrice),
        priceIncrease: serializeMoney(order.configuration.priceIncrease),
        shippingPrice: serializeMoney(order.configuration.shippingPrice),
        discount: serializeRate(order.configuration.discount),
        quantity: order.configuration.quantity,
        lampPriceIncrease:
          order.configuration.lampPriceIncrease == null
            ? undefined
            : serializeMoney(order.configuration.lampPriceIncrease),
        totalPrice: serializeMoney(order.configuration.totalPrice),
        currency: order.configuration.currency as SupportedCurrency,
        productIp: order.configuration.productIp
          ? (order.configuration.productIp as ProductIP)
          : undefined,
        createdAt: order.configuration.createdAt,
        updatedAt: order.configuration.updatedAt,
      }
    : null

  const localizedOrder: OrderWithRelations = {
    ...serializeRowMoney(order),
    status: order.status as OrderStatus,
    currency: order.currency as SupportedCurrency,
    customerLanguage: order.customerLanguage as SupportedLanguage,
    priceIncrease: order.priceIncrease == null ? undefined : serializeMoney(order.priceIncrease),
    brand: order.brand ?? undefined,
    chandelierLightingType: order.chandelierLightingType ?? undefined,
    configurationId: order.configurationId ?? undefined,
    discount: orderDiscount,
    productName: localizedProductName,
    configuration: localizedConfiguration,
    product: {
      ...serializeRowMoney(order.product),
      maxIP: order.product.maxIP ?? undefined,
      priceIncrease:
        order.product.priceIncrease == null ? undefined : serializeMoney(order.product.priceIncrease),
      hNumber: order.product.hNumber ?? undefined,
      chandelierLightingType: order.product.chandelierLightingType ?? undefined,
      translations: localizedTranslations,
      specifications: localizedSpecifications,
      productChandelierLamp: (order.product as any).productChandelierLamp ?? null,
    } as Product & { specifications: ProductSpecification[] },
  }

  return (
    <Complete
      discount={orderDiscount}
      brand={order.brand || ""}
      order={localizedOrder}
    />
  )
}

export async function generateMetadata({ params, searchParams }: PagePropsTypes): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const orderId = resolvedSearchParams?.orderId
  const resolvedParams = await params
  const { locale: localeParam } = resolvedParams
  const locale = getLocaleFromParams(resolvedParams)

  const titles: Record<string, string> = {
    en: "Order Confirmed!",
    ar: "تم تأكيد الطلب!",
  }

  const descriptions: Record<string, string> = {
    en: "Please review your order before it is completed.",
    ar: "يرجى مراجعة طلبك قبل إتمامه.",
  }

  let productImage: string = locale === "ar" ? "/logo-ar.png" : "/logo-en.png"

  if (orderId && typeof orderId === "string") {
    const order = await prisma.order.findUnique({
      where: { id: Number.parseInt(orderId, 10) },
      include: {
        product: { include: { images: productImageSelect() } },
      },
    })

    const [firstImage] = imageUrls(order?.product ?? {})
    if (firstImage) {
      productImage = firstImage
    }
  }

  return constructMetadata({
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    image: productImage,
  })
}

export default Page