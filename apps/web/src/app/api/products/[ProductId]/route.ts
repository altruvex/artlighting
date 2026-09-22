import { prisma } from "@repo/database"
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { localizeSpecGroups, specGroupSelect, specsByKey } from "@/lib/spec-groups";
import { availableFrom, inventorySelect } from "@repo/catalog";
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  ProductId: z.string(),
})

const QuerySchema = z.object({
  locale: z.string().optional().default('en'),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ ProductId: string }> }) {
  try {
    const awaitedParams = await params
    const validatedParams = ParamsSchema.parse(awaitedParams)
    const { ProductId } = validatedParams

    // Extract locale from query parameters
    const { searchParams } = new URL(request.url)
    const { locale } = QuerySchema.parse(Object.fromEntries(searchParams))

    console.log(`API: Fetching product with ID: ${ProductId}, locale: ${locale}`)

    const product = await prisma.product.findUnique({
      where: {
        productId: ProductId,
      },
      select: {
        id: true,
        productId: true,
        productName: true,
        price: true,
        images: productImageSelect(),
        sectionType: true,
        spotlightType: true,
        brand: true,
        productColor: true,
        productIp: true,
        productChandLamp: true,
        maxIP: true,
        hNumber: true,
        chandelierLightingType: true,
        // Sellable units come from the ledger, not from a column.
        variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
        isActive: true,
        featured: true,
        categoryId: true,
        lightingtypeId: true,
        createdAt: true,
        updatedAt: true,
        translations: {
          where: { language: locale },
          select: {
            name: true,
            description: true
          }
        },
        specGroups: specGroupSelect(locale),
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            translations: {
              where: { language: locale },
              select: {
                name: true,
                description: true
              }
            }
          }
        },
        lightingtype: {
          select: {
            id: true,
            name: true,
            slug: true,
            translations: {
              where: { language: locale },
              select: {
                name: true,
                description: true
              }
            }
          }
        }
      },
    })

    if (!product) {
      console.log(`API: Product not found: ${ProductId}`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // The structured specs, by key — the legacy ProductSpecification
    // columns are no longer written.
    const { specGroups, ...row } = product
    const specs = specsByKey(localizeSpecGroups(specGroups, locale))

    // Merge localized data with proper fallbacks
    const localizedProduct = {
      ...row,
      productName: product.translations[0]?.name || product.productName,
      description: product.translations[0]?.description || null,
      categoryName: product.category?.translations[0]?.name || product.category?.name,
      lightingTypeName: product.lightingtype?.translations[0]?.name || product.lightingtype?.name,
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
    }

    console.log(`API: Successfully fetched product: ${ProductId}`)
    return NextResponse.json(localizedProduct)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API: Invalid parameters:", error.message)
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    console.error("API: Failed to fetch product:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}