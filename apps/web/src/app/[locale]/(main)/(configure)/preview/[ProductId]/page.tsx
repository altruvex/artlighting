import { auth } from "@/lib/auth-server"
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { localizeSpecGroups, specGroupSelect, specsByKey } from "@/lib/spec-groups";
import { toViewConfiguration } from "@/lib/serialize-money";
import { readGuestToken } from "@/lib/guest-token"
import { editableConfigurationId } from "@/lib/configuration-access.server"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { PagePropsTypes } from "@/types"
import { prisma } from "@repo/database"
import type { Metadata } from "next"
import { constructMetadata } from "@/lib/metadata"
import { notFound, unstable_rethrow } from "next/navigation"
import Preview, { type PreviewProduct } from "./preview"

// The spec keys behind the six figures the screen shows; nothing else is read.
const FIGURE_KEYS = ["luminousFlux", "colorTemperature", "beamAngle", "cri", "mainMaterial", "lifeTime"] as const

const Page = async ({ params, searchParams }: PagePropsTypes) => {
  const resolvedParams = await params
  const locale = getLocaleFromParams(resolvedParams)
  const { ProductId } = resolvedParams
  const resolvedSearchParams = await searchParams
  const id = resolvedSearchParams?.id

  if (!ProductId && (!id || typeof id !== "string")) {
    console.error("Missing required parameters:", { ProductId, id })
    return notFound()
  }

  try {
    // Read only. The row is made when the customer first chooses something
    // on the product page (ensureConfiguration), and the "order now" save
    // that leads here needs it — a page view must not write.
    let configuration = null
    if (ProductId) {
      const { userId } = await auth()
      const guestToken = await readGuestToken()
      configuration = await prisma.configuration.findFirst({
        where: userId
          ? { productId: ProductId, userId }
          : { productId: ProductId, userId: null, guestToken },
        orderBy: { updatedAt: 'desc' }
      })
    }
    if (!configuration && id && typeof id === "string") {
      // Only the visitor's own configuration: a cuid in the URL is not a
      // credential, and someone else's row answers like a missing one.
      const ownedId = await editableConfigurationId(id)
      configuration = ownedId
        ? await prisma.configuration.findUnique({ where: { id: ownedId } })
        : null
    }

    if (!configuration) {
      console.error("Configuration not found after all attempts")
      return notFound()
    }

    // Only what the screen shows: name, photos, the two labels and the six
    // headline figures. `cost` and the other Decimals never leave the query.
    const specSelect = specGroupSelect(locale)
    const product = await prisma.product.findUnique({
      where: { productId: configuration.productId },
      select: {
        productName: true,
        images: productImageSelect(),
        translations: { where: { language: locale }, select: { name: true }, take: 1 },
        category: {
          select: { name: true, translations: { where: { language: locale }, select: { name: true }, take: 1 } },
        },
        lightingtype: {
          select: { name: true, translations: { where: { language: locale }, select: { name: true }, take: 1 } },
        },
        specGroups: {
          ...specSelect,
          select: {
            ...specSelect.select,
            items: { ...specSelect.select.items, where: { key: { in: [...FIGURE_KEYS] } } },
          },
        },
      },
    })

    if (!product) {
      console.error("Product not found after all attempts")
      return notFound()
    }
    // The structured specs, by key. Read here rather than spread: their
    // measurements are Decimals, which cannot cross into a Client Component.
    const specs = specsByKey(localizeSpecGroups(product.specGroups, locale))

    const localizedProduct: PreviewProduct = {
      // The ProductImage table, not the legacy array — see lib/product-images.
      productImages: imageUrls(product),
      productName: product.translations[0]?.name || product.productName,
      categoryName: product.category?.translations[0]?.name || product.category?.name,
      lightingTypeName: product.lightingtype?.translations[0]?.name || product.lightingtype?.name,
      luminousFlux: specs.luminousFlux,
      mainMaterial: specs.mainMaterial,
      beamAngle: specs.beamAngle,
      colorTemperature: specs.colorTemperature,
      lifeTime: specs.lifeTime,
      cri: specs.cri,
    }

    return (
      <Preview
        configuration={toViewConfiguration(configuration)}
        productId={configuration.productId}
        product={localizedProduct}
      />
    )
  } catch (error) {
    // notFound() works by throwing, so it lands here too. Let the interrupt
    // through untouched — see lib/attempt for what catching it costs.
    unstable_rethrow(error)
    // Everything else is a 500. Answering a database blip with "this product
    // does not exist" tells the customer the wrong thing and asks Google to
    // drop a page that is fine.
    console.error("Error loading preview data:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "Unknown error")
    throw error
  }
}

/**
 * A step in checkout, not a page to be found: it is noindexed, and titled
 * plainly. It used to generate an "Energy Efficient LED Spotlight" title
 * for every product, whatever the product was.
 */
export const generateMetadata = async ({ params }: PagePropsTypes): Promise<Metadata> => {
  const locale = getLocaleFromParams(await params)
  return constructMetadata({
    locale,
    title: locale === "ar" ? "مراجعة الطلب | آرت لايتنج" : "Review your order | Art Lighting",
    noIndex: true,
  })
}

// The visitor's own saved configuration — nothing is shared between visitors
// to prefetch, so this page blocks instead.
export const instant = false

export default Page
