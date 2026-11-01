"use server"

import { prisma } from "@repo/database"
import { priceLine } from "@/lib/pricing"
import { PricingService } from "@/lib/pricing.server"
import { editableConfigurationId } from "@/lib/configuration-access.server"
import { publicConfiguration } from "@/lib/guest-token"
import { serializeRowMoney } from "@/lib/serialize-money"

export interface SaveConfigArgs {
  configId: string
  productId: string
  quantity: number
}

export async function saveConfig({
  configId,
  quantity,
}: SaveConfigArgs) {
  try {
    // Only the visitor's own configuration; anyone else's reads as missing.
    const ownId = await editableConfigurationId(configId)
    const existingConfig = ownId ? await prisma.configuration.findUnique({
      where: { id: ownId },
      select: {
        id: true,
        productId: true,
        productIp: true,
        shippingPrice: true,
      },
    }) : null

    if (!existingConfig) {
      throw new Error(`Configuration with ID ${configId} not found`)
    }

    const product = await prisma.product.findUnique({
      where: { productId: existingConfig.productId },
      select: {
        productId: true,
        price: true,
        priceIncrease: true,
        productIp: true,
        productChandLamp: true,
        hNumber: true,
        isActive: true,
      },
    })
    if (!product) throw new Error("Product not found")
    if (!product.isActive) throw new Error("Product is not available")

    const currentConfig = await prisma.configuration.findUnique({
      where: { id: configId },
      select: {
        priceIncrease: true,
        lampPriceIncrease: true,
        shippingPrice: true,
        productIp: true,
        // The configuration's own snapshot of the rate it was quoted at.
        discount: true,
      },
    })
    if (!currentConfig) throw new Error("Configuration not found")

    const priceIncrease = currentConfig.priceIncrease ?? product.priceIncrease ?? 0
    const lampPriceIncrease = currentConfig.lampPriceIncrease ?? 0
    const discount = currentConfig.discount
    const shippingPrice = currentConfig.shippingPrice ?? existingConfig.shippingPrice ?? 69

    // One helper computes every line price (see lib/pricing.ts): the
    // discount is a rate, and the arithmetic is Decimal, not float.
    const pricing = priceLine({
      unitPrice: product.price,
      quantity,
      priceIncrease,
      lampPriceIncrease,
      discountRate: discount,
      shippingPrice,
    })

    const updatedConfiguration = await prisma.configuration.update({
      where: { id: configId },
      data: {
        productId: product.productId,
        configPrice: pricing.unitConfigPrice,
        priceIncrease,
        lampPriceIncrease,
        shippingPrice,
        quantity,
        discount,
        totalPrice: pricing.total,
      },
    })

    return {
      success: true,
      // Money leaves as strings: a Prisma.Decimal cannot reach a Client Component.
      configuration: serializeRowMoney(publicConfiguration(updatedConfiguration)),
      message: "Configuration saved successfully",
    }
  } catch (error) {
    console.error("Error saving configuration:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      configuration: null,
    }
  }
}