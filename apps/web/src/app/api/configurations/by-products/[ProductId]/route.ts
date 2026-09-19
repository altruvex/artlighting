import { auth } from "@/lib/auth-server"
import { publicConfiguration, readGuestToken } from "@/lib/guest-token"
import { prisma } from "@repo/database"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  ProductId: z.string(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ ProductId: string }> }) {
  try {
    const awaitedParams = await params
    const { ProductId } = ParamsSchema.parse(awaitedParams)

    console.log(`API: Fetching configuration for ProductId: ${ProductId}`)

    // Scoped to the caller (or to the anonymous pool when signed out), so
    // customers don't share and overwrite one configuration row.
    const { userId } = await auth()
    const guestToken = await readGuestToken()

    const configuration = await prisma.configuration.findFirst({
      where: userId
        ? { productId: ProductId, userId }
        : { productId: ProductId, userId: null, guestToken },
      orderBy: { updatedAt: "desc" },
    })

    if (!configuration) {
      console.log(`API: Configuration not found for ProductId: ${ProductId}`)

      // Try to create a default configuration if product exists
      const product = await prisma.product.findUnique({
        where: { productId: ProductId },
        select: { productId: true, price: true, discount: true }
      })

      if (product) {
        console.log(`API: Creating default configuration for ProductId: ${ProductId}`)
        const newConfiguration = await prisma.configuration.create({
          data: {
            productId: ProductId,
            userId: userId ?? null,
            guestToken: userId ? null : guestToken,
            configPrice: product.price,
            priceIncrease: 0,
            shippingPrice: 69,
            discount: product.discount,
            quantity: 1,
            totalPrice: product.price,
          },
        })

        console.log(`API: Created configuration: ${newConfiguration.id}`)
        return NextResponse.json(publicConfiguration(newConfiguration))
      }

      return NextResponse.json({ error: "Configuration not found" }, { status: 404 })
    }

    console.log(`API: Successfully fetched configuration: ${configuration.id}`)
    return NextResponse.json(publicConfiguration(configuration))
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API: Invalid ProductId:", error.message)
      return NextResponse.json({ error: "Invalid ProductId" }, { status: 400 })
    }

    console.error("API: Failed to fetch configuration:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}