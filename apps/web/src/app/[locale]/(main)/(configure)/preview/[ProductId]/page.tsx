import { auth } from "@/lib/auth-server"
import { productDiscountRates } from "@repo/catalog";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { localizeSpecGroups, specGroupSelect, specsByKey } from "@/lib/spec-groups";
import { serializeRate } from "@repo/money";
import { serializeRowMoney, toViewConfiguration } from "@/lib/serialize-money";
import { readGuestToken } from "@/lib/guest-token"
import { editableConfigurationId } from "@/lib/configuration-access.server"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { PagePropsTypes } from "@/types"
import { prisma } from "@repo/database"
import type { Metadata } from "next"
import { constructMetadata } from "@/lib/metadata"
import { notFound, unstable_rethrow } from "next/navigation"
import Preview, { type ProductWithSpecs } from "./preview"

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

  let configuration = null
  let product = null

  try {
    if (ProductId) {
      const { userId } = await auth()
      const guestToken = await readGuestToken()
      configuration = await prisma.configuration.findFirst({
        where: userId
          ? { productId: ProductId, userId }
          : { productId: ProductId, userId: null, guestToken },
        orderBy: { updatedAt: 'desc' }
      })

      if (!configuration) {
        const productExists = await prisma.product.findUnique({
          where: { productId: ProductId },
          // The engine reads these to decide what applies.
          select: { id: true, productId: true, price: true, categoryId: true, lightingtypeId: true, sectionType: true }
        })

        if (productExists) {
          configuration = await prisma.configuration.create({
            data: {
              productId: ProductId,
              userId: userId ?? null,
              guestToken: userId ? null : guestToken,
              configPrice: productExists.price,
              priceIncrease: 0,
              shippingPrice: 69,
              // From the engine, so a configuration never captures a
              // promotion that has ended or has not started.
              discount: (await productDiscountRates([productExists], prisma))[productExists.id] ?? "0",
              quantity: 1,
              totalPrice: productExists.price,
            },
          })
        }
      }
      product = await prisma.product.findUnique({
        where: { productId: ProductId },
        include: {
          images: productImageSelect(),
          category: {
            include: {
              translations: {
                where: { language: locale }
              }
            }
          },
          lightingtype: {
            include: {
              translations: {
                where: { language: locale }
              }
            }
          },
          translations: {
            where: { language: locale }
          },
          specGroups: specGroupSelect(locale),
        }
      })
    }
    if (!configuration && id && typeof id === "string") {
      // Only the visitor's own configuration: a cuid in the URL is not a
      // credential, and someone else's row answers like a missing one.
      const ownedId = await editableConfigurationId(id)
      configuration = ownedId
        ? await prisma.configuration.findUnique({ where: { id: ownedId } })
        : null

      if (configuration) {

        product = await prisma.product.findUnique({
          where: { productId: configuration.productId },
          include: {
            images: productImageSelect(),
            category: {
              include: {
                translations: {
                  where: { language: locale }
                }
              }
            },
            lightingtype: {
              include: {
                translations: {
                  where: { language: locale }
                }
              }
            },
            translations: {
              where: { language: locale }
            },
            specGroups: specGroupSelect(locale),
          }
        })
      }
    }

    if (!configuration) {
      console.error("Configuration not found after all attempts")
      return notFound()
    }

    if (!product) {
      console.error("Product not found after all attempts")
      return notFound()
    }
    // `cost` is what the product costs the company — it never leaves the
    // admin — and it, the "was" price and the rating are Decimals a Client
    // Component cannot receive. The whole row used to be spread into the
    // page, cost included.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cost: _cost, compareAtPrice: _compareAtPrice, ratingAverage: _ratingAverage, specGroups, ...productRow } = product
    // The structured specs, by key — the legacy ProductSpecification
    // columns are no longer written. Read here rather than spread: their
    // measurements are Decimals too.
    const specs = specsByKey(localizeSpecGroups(specGroups, locale))

    const localizedProduct: ProductWithSpecs = {
      // Money leaves the server as strings; a Prisma.Decimal cannot cross
      // into a Client Component (see @repo/money).
      ...serializeRowMoney(productRow),
      // The effective rate, from the engine — there is no rate on a
      // product row any more.
      discount: (await productDiscountRates([product], prisma))[product.id] ?? "0",
      // The ProductImage table, not the legacy array — see lib/product-images.
      productImages: imageUrls(product),
      productName: product.translations?.[0]?.name || product.productName,
      description: product.translations?.[0]?.description ?? undefined,
      categoryName: product.category?.translations?.[0]?.name || product.category?.name,
      lightingTypeName: product.lightingtype?.translations?.[0]?.name || product.lightingtype?.name,
      maxIP: product.maxIP ?? undefined,
      luminousFlux: specs.luminousFlux,
      mainMaterial: specs.mainMaterial,
      beamAngle: specs.beamAngle,
      colorTemperature: specs.colorTemperature,
      lifeTime: specs.lifeTime,
      energySaving: specs.energySaving,
      cri: specs.cri,
      brandOfLed: specs.brandOfLed,
      electrical: specs.electrical,
      input: specs.input,
      finish: specs.finish,
      lampBase: specs.lampBase,
      hNumber: product.hNumber ?? undefined,
      chandelierLightingType: product.chandelierLightingType ?? undefined,
    }


    return (
      <Preview
        configuration={toViewConfiguration(configuration)}
        discount={serializeRate(configuration.discount)}
        productId={configuration.productId}
        product={localizedProduct}
        locale={locale}
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
