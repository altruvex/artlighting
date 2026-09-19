import { prisma } from "@repo/database"
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
        productImages: true,
        discount: true,
        sectionType: true,
        spotlightType: true,
        brand: true,
        productColor: true,
        productIp: true,
        productChandLamp: true,
        maxIP: true,
        hNumber: true,
        chandelierLightingType: true,
        quantity: true,
        isActive: true,
        featured: true,
        categoryId: true,
        lightingtypeId: true,
        createdAt: true,
        updatedAt: true,
        // Add specification fields if they exist directly on Product table
        // Remove these if they don't exist in your Product model:
        // luminousFlux: true,
        // mainMaterial: true,
        // beamAngle: true,
        // colorTemperature: true,
        // lifeTime: true,
        // energySaving: true,
        // cri: true,
        // brandOfLed: true,
        // electrical: true,
        // input: true,
        // finish: true,
        // lampBase: true,
        // maximumWattage: true,
        // workingTemperature: true,
        // fixtureDimmable: true,
        // powerFactor: true,
        // ip: true,
        translations: {
          where: { language: locale },
          select: {
            name: true,
            description: true
          }
        },
        specifications: {
          where: { language: locale },
          select: {
            input: true,
            maximumWattage: true,
            brandOfLed: true,
            luminousFlux: true,
            mainMaterial: true,
            cri: true,
            beamAngle: true,
            workingTemperature: true,
            fixtureDimmable: true,
            electrical: true,
            powerFactor: true,
            colorTemperature: true,
            ip: true,
            energySaving: true,
            lifeTime: true,
            finish: true,
            lampBase: true,
            bulb: true,
            customSpecs: true,
          }
        },
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

    // Merge localized data with proper fallbacks
    const localizedProduct = {
      ...product,
      productName: product.translations[0]?.name || product.productName,
      description: product.translations[0]?.description || null,
      specification: product.specifications[0] || null,
      localizedSpecs: product.specifications[0] || {},
      categoryName: product.category?.translations[0]?.name || product.category?.name,
      lightingTypeName: product.lightingtype?.translations[0]?.name || product.lightingtype?.name,
      // Map specifications to match your component expectations
      luminousFlux: product.specifications[0]?.luminousFlux,
      mainMaterial: product.specifications[0]?.mainMaterial,
      beamAngle: product.specifications[0]?.beamAngle,
      colorTemperature: product.specifications[0]?.colorTemperature,
      lifeTime: product.specifications[0]?.lifeTime,
      energySaving: product.specifications[0]?.energySaving,
      cri: product.specifications[0]?.cri,
      brandOfLed: product.specifications[0]?.brandOfLed,
      electrical: product.specifications[0]?.electrical,
      input: product.specifications[0]?.input,
      finish: product.specifications[0]?.finish,
      lampBase: product.specifications[0]?.lampBase,
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