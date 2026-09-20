import { auth } from "@/lib/auth-server"
import { familySlug, productDiscountRates } from "@repo/catalog";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { serializeRate } from "@repo/money";
import { serializeRowMoney, toViewConfiguration } from "@/lib/serialize-money";
import { readGuestToken } from "@/lib/guest-token"
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils"
import { PagePropsTypes } from "@/types"
import { prisma } from "@repo/database"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Preview, { type ProductWithSpecs } from "./preview"

const Page = async ({ params, searchParams }: PagePropsTypes) => {
  const resolvedParams = await params
  const locale = getLocaleFromParams(resolvedParams)
  const { ProductId } = resolvedParams
  const resolvedSearchParams = await searchParams
  const id = resolvedSearchParams?.id

  console.log("Preview page - Resolved parameters:", {
    locale,
    ProductId,
    searchParamsId: id,
    timestamp: new Date().toISOString()
  })

  const { service } = await getServerI18n(locale)

  if (!ProductId && (!id || typeof id !== "string")) {
    console.error("Missing required parameters:", { ProductId, id })
    return notFound()
  }

  let configuration = null
  let product = null
  let productSpecification = null

  try {
    if (ProductId) {
      console.log(`Fetching configuration for ProductId: ${ProductId}`)
      const { userId } = await auth()
      const guestToken = await readGuestToken()
      configuration = await prisma.configuration.findFirst({
        where: userId
          ? { productId: ProductId, userId }
          : { productId: ProductId, userId: null, guestToken },
        orderBy: { updatedAt: 'desc' }
      })

      if (configuration) {
        console.log(`Found configuration: ${configuration.id}`)
      } else {
        console.log(`No configuration found for ProductId: ${ProductId}, creating default`)
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
          console.log(`Created default configuration: ${configuration.id}`)
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
          specifications: {
            where: { language: locale }
          }
        }
      })
      // Keyed on Product.id now, not the SKU — `product` was just fetched
      // by SKU above, so its id is the right key here.
      productSpecification = product
        ? await prisma.productSpecification.findUnique({
            where: {
              productId_language: {
                productId: product.id,
                language: locale
              }
            }
          })
        : null
      console.log("Product fetch result:", {
        found: !!product,
        hasTranslations: product?.translations?.length ?? 0,
        hasSpecifications: product?.specifications?.length ?? 0,
      })
    }
    if (!configuration && id && typeof id === "string") {
      console.log(`Fallback: Fetching configuration by ID: ${id}`)

      configuration = await prisma.configuration.findUnique({
        where: { id },
      })

      if (configuration) {
        console.log(`Found configuration by ID: ${configuration.id}, productId: ${configuration.productId}`)

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
            specifications: {
              where: { language: locale }
            }
          }
        })

        productSpecification = product
          ? await prisma.productSpecification.findUnique({
              where: {
                productId_language: {
                  productId: product.id,
                  language: locale
                }
              }
            })
          : null
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
    const primarySpecification = product.specifications?.[0] || productSpecification || undefined

    const localizedProduct: ProductWithSpecs = {
      // Money leaves the server as strings; a Prisma.Decimal cannot cross
      // into a Client Component (see @repo/money).
      ...serializeRowMoney(product),
      // The effective rate, from the engine — there is no rate on a
      // product row any more.
      discount: (await productDiscountRates([product], prisma))[product.id] ?? "0",
      // The ProductImage table, not the legacy array — see lib/product-images.
      productImages: imageUrls(product),
      productName: product.translations?.[0]?.name || product.productName,
      description: product.translations?.[0]?.description ?? undefined,
      localizedSpecs: primarySpecification,
      specification: primarySpecification,
      categoryName: product.category?.translations?.[0]?.name || product.category?.name,
      lightingTypeName: product.lightingtype?.translations?.[0]?.name || product.lightingtype?.name,
      maxIP: product.maxIP ?? undefined,
      luminousFlux: primarySpecification?.luminousFlux ?? undefined,
      mainMaterial: primarySpecification?.mainMaterial ?? undefined,
      beamAngle: primarySpecification?.beamAngle ?? undefined,
      colorTemperature: primarySpecification?.colorTemperature ?? undefined,
      lifeTime: primarySpecification?.lifeTime ?? undefined,
      energySaving: primarySpecification?.energySaving ?? undefined,
      cri: primarySpecification?.cri ?? undefined,
      brandOfLed: primarySpecification?.brandOfLed ?? undefined,
      electrical: primarySpecification?.electrical ?? undefined,
      input: primarySpecification?.input ?? undefined,
      finish: primarySpecification?.finish ?? undefined,
      lampBase: primarySpecification?.lampBase ?? undefined,
      hNumber: product.hNumber ?? undefined,
      chandelierLightingType: product.chandelierLightingType ?? undefined,
    }

    console.log("Final data for preview:", {
      configurationId: configuration.id,
      productId: localizedProduct.productId,
      productName: localizedProduct.productName,
      hasLocalizedSpecs: !!localizedProduct.localizedSpecs,
      locale
    })

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
    console.error("Error loading preview data:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "Unknown error")
    return notFound()
  }
}

export const generateMetadata = async ({ params }: PagePropsTypes): Promise<Metadata> => {
  const resolvedParams = await params
  const locale = getLocaleFromParams(resolvedParams)
  const { ProductId } = resolvedParams

  try {
    const product = await prisma.product.findFirst({
      where: { productId: ProductId },
      include: {
        translations: {
          where: { language: locale }
        },
        specifications: {
          where: { language: locale }
        },
        images: productImageSelect()
      }
    })

    if (!product) {
      const fallbackTitles = {
        en: "Unknown Product",
        ar: "منتج غير معروف"
      } as const

      const fallbackDescriptions = {
        en: "Product not found",
        ar: "المنتج غير موجود"
      } as const

      return {
        title: fallbackTitles[locale as keyof typeof fallbackTitles] || fallbackTitles.en,
        description: fallbackDescriptions[locale as keyof typeof fallbackDescriptions] || fallbackDescriptions.en,
      }
    }

    const localizedName = product.translations?.[0]?.name || product.productName
    const specification = product.specifications?.[0]

    // The enum is a value, not a label: if a family ever loses its copy below,
    // the slug is what shows, never "INDOOR".
    let titleToSectionType: string = familySlug(product.sectionType)
    let typeOfSpotlight = ""

    const sectionTypeTranslations = {
      INDOOR: {
        en: { title: "Indoor lighting", description: "Ideal for homes and offices" },
        ar: { title: "الإضاءة الداخلية", description: "مثالية للمنازل والمكاتب" }
      },
      OUTDOOR: {
        en: { title: "Outdoor lighting", description: "Create the perfect ambiance for outdoor entertaining" },
        ar: { title: "الإضاءة الخارجية", description: "اخلق الأجواء المثالية للترفيه في الهواء الطلق" }
      },
      CHANDELIER: {
        en: { title: "Chandelier", description: "A chandelier is a branched, decorative lighting fixture designed to be hung from the ceiling." },
        ar: { title: "ثريا", description: "الثريا هي تركيبة إضاءة زخرفية متفرعة مصممة للتعليق من السقف." }
      }
    } as const

    const sectionData = sectionTypeTranslations[product.sectionType]
    if (sectionData) {
      const localeData = sectionData[locale as keyof typeof sectionData] || sectionData.en
      titleToSectionType = localeData.title
      typeOfSpotlight = localeData.description
    }

    const titleTemplates = {
      en: `Preview ${localizedName} LED Spotlight | ${product.brand} | Energy Efficient ${titleToSectionType}`,
      ar: `معاينة ${localizedName} كشاف LED | ${product.brand} | ${titleToSectionType} موفر للطاقة`
    } as const

    const descriptionTemplates = {
      en: `Preview of ${localizedName} With a high CRI ${specification?.cri || 'N/A'}, and high beam angle of ${specification?.beamAngle || 'N/A'} this spotlight provides bright, ${typeOfSpotlight}`,
      ar: `معاينة ${localizedName} بمؤشر إضاءة عالي ${specification?.cri || 'غير متاح'}، وزاوية شعاع عالية ${specification?.beamAngle || 'غير متاح'} يوفر هذا الكشاف إضاءة ساطعة، ${typeOfSpotlight}`
    } as const
    const imageUrl = imageUrls(product)[0]

    return {
      title: titleTemplates[locale as keyof typeof titleTemplates] || titleTemplates.en,
      description: descriptionTemplates[locale as keyof typeof descriptionTemplates] || descriptionTemplates.en,
      openGraph: {
        images: [imageUrl]
      },
      twitter: {
        card: "summary_large_image",
        images: [imageUrl]
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Preview Product",
      description: "Product preview page",
    }
  }
}

export default Page