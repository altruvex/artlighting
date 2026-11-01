"use server"

import { prisma } from "@repo/database"
import { limitAction } from "@/middleware/ratelimit"
import { priceLine } from "@/lib/pricing"
import { auth } from "@/lib/auth-server"
import { ownsConfiguration, publicConfiguration, readGuestToken } from "@/lib/guest-token"
import { serializeRowMoney } from "@/lib/serialize-money"

export interface SaveConfigArgs {
  configId: string
  productId: string
  quantity: number
}

export async function saveConfig({
  configId,
  quantity: requested,
}: SaveConfigArgs) {
  // Untrusted input: the same bounds checkout applies (lib/checkout.server).
  if (!Number.isInteger(requested) || requested < 1) {
    return { success: false, error: "Invalid quantity", configuration: null }
  }
  // Guests can call this too, so it is keyed by IP: the generous API limit.
  if (!(await limitAction("api"))) {
    return { success: false, error: "Too many requests", configuration: null }
  }
  const quantity = Math.min(100, requested)
  try {
    // One read: the row, with its owner, so the ownership check and the
    // pricing inputs come from the same query.
    const [{ userId }, guestToken, config] = await Promise.all([
      auth(),
      readGuestToken(),
      prisma.configuration.findUnique({
        where: { id: configId },
        select: {
          productId: true,
          userId: true,
          guestToken: true,
          priceIncrease: true,
          lampPriceIncrease: true,
          shippingPrice: true,
          // The configuration's own snapshot of the rate it was quoted at.
          discount: true,
        },
      }),
    ])
    // Only the visitor's own configuration; anyone else's reads as missing.
    if (!config || !ownsConfiguration(config, { userId, guestToken })) {
      throw new Error(`Configuration with ID ${configId} not found`)
    }

    const product = await prisma.product.findUnique({
      where: { productId: config.productId },
      select: { productId: true, price: true, priceIncrease: true, isActive: true },
    })
    if (!product) throw new Error("Product not found")
    if (!product.isActive) throw new Error("Product is not available")

    const priceIncrease = config.priceIncrease ?? product.priceIncrease ?? 0
    const lampPriceIncrease = config.lampPriceIncrease ?? 0
    const discount = config.discount
    const shippingPrice = config.shippingPrice ?? 69

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
      // Not error.message: a Prisma error would hand its internals to the browser.
      error: "Failed to save configuration",
      configuration: null,
    }
  }
}