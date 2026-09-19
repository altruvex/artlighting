import { auth } from "@/lib/auth-server"
import { prisma } from "@repo/database"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/** Upper bound so a single line can't be inflated into an absurd order. */
const MAX_QUANTITY = 100

const SaveConfigSchema = z.object({
    quantity: z.number().int().positive("Quantity must be a positive integer").max(MAX_QUANTITY),
})

export type SaveConfigArgs = z.infer<typeof SaveConfigSchema>

interface SaveConfigResponse {
    success: boolean
    configId?: string
    error?: string
    data?: any
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ configId: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { configId } = await params
        const body = await request.json()

        // Validate input data
        const validatedData = SaveConfigSchema.parse(body)

        const {
            quantity,
        } = validatedData

        // Verify that the configuration exists
        const existingConfig = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                orders: {
                    select: { id: true }
                }
            }
        })

        // A configuration owned by someone else answers exactly like one that
        // doesn't exist, so ids can't be probed by watching the status code.
        const isForeign = Boolean(existingConfig?.userId) && existingConfig?.userId !== userId
        if (!existingConfig || isForeign) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Configuration not found"
                },
                { status: 404 }
            )
        }

        // Once an order references it, the configuration is part of that
        // order's record and must not change underneath it.
        if (existingConfig.orders.length > 0) {
            return NextResponse.json(
                { success: false, error: "This configuration belongs to a placed order" },
                { status: 409 },
            )
        }

        const product = await prisma.product.findUnique({
            where: { productId: existingConfig.productId },
            select: {
                id: true,
                productId: true,
                productName: true,
                price: true,
                discount: true,
                priceIncrease: true,
                isActive: true
            }
        })

        if (!product) {
            console.error(`Product not found: ${existingConfig.productId}`)
            return NextResponse.json(
                {
                    success: false,
                    error: "Product not found"
                },
                { status: 404 }
            )
        }

        if (!product.isActive) {
            console.error(`Product is not active: ${existingConfig.productId}`)
            return NextResponse.json(
                {
                    success: false,
                    error: "Product is not available"
                },
                { status: 400 }
            )
        }

        const currentConfig = await prisma.configuration.findUnique({
            where: { id: configId },
            select: {
                priceIncrease: true,
                lampPriceIncrease: true,
                discount: true,
                shippingPrice: true,
            }
        })
        if (!currentConfig) {
            return NextResponse.json({ success: false, error: "Configuration not found" }, { status: 404 })
        }

        const priceIncrease = currentConfig.priceIncrease ?? product.priceIncrease ?? 0
        const lampPriceIncrease = currentConfig.lampPriceIncrease ?? 0
        const discount = currentConfig.discount ?? product.discount ?? 0
        const shippingPrice = currentConfig.shippingPrice ?? existingConfig.shippingPrice ?? 69
        
        // Calculate unit price (base + increases)
        const unitConfigPrice = product.price + priceIncrease + lampPriceIncrease
        
        // Calculate subtotal
        const subtotal = unitConfigPrice * quantity
        
        // Calculate final total
        const discountAmount = discount > 0 
            ? subtotal * (discount > 1 ? discount / 100 : discount) 
            : 0
            
        const finalTotal = subtotal - discountAmount + shippingPrice

        const updatedConfig = await prisma.configuration.update({
            where: { id: configId },
            data: {
                quantity,
                productId: existingConfig.productId,
                // First authenticated write claims an anonymous configuration.
                userId,
                configPrice: unitConfigPrice,
                priceIncrease,
                lampPriceIncrease,
                discount,
                totalPrice: finalTotal,
                shippingPrice, 
                updatedAt: new Date(),
            }
        })

        return NextResponse.json({
            success: true,
            configId: updatedConfig.id,
            data: {
                configuration: updatedConfig,
                product: {
                    id: product.id,
                    productId: product.productId,
                    productName: product.productName
                }
            }
        })

    } catch (error) {
        console.error("Error saving configuration:", error)

        if (error instanceof z.ZodError) {
            const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            console.error("Validation errors:", errorMessage)
            return NextResponse.json(
                {
                    success: false,
                    error: `Validation failed: ${errorMessage}`
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            },
            { status: 500 }
        )
    }
}