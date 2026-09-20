"use server"

import { auth } from "@/lib/auth-server"
import { money, roundMoney } from "@repo/money"
import { priceLine } from "@/lib/pricing"
import { prisma } from "@repo/database"

export async function createOrder({
  configId,
  quantity,
}: {
  configId: string
  quantity: number
}) {
  console.log("Starting createOrder function")

  try {
    const { userId } = await auth()
    if (!userId) {
      console.error("User not authenticated")
      throw new Error("You need to be logged in")
    }

    const configuration = await prisma.configuration.findUnique({
      where: { id: configId },
    })

    if (!configuration) {
      console.error("Configuration not found")
      throw new Error("Configuration not found")
    }

    const product = await prisma.product.findUnique({
      where: { productId: configuration.productId },
    })

    if (!product) {
      console.error("Product not found")
      throw new Error("Product not found")
    }

    // The User row already exists once `userId` is a valid session's user id
    // — Better Auth writes it directly to this same table at sign-up, no
    // separate identity provider to sync from anymore.
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    let shippingAddress = await prisma.shippingAddress.findFirst({
      where: { userId: userId },
    })

    if (!shippingAddress) {
      shippingAddress = await prisma.shippingAddress.create({
        data: {
          userId: userId,
          fullName: dbUser.name,
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          phoneNumber: dbUser.phoneNumber ?? "",
        },
      })
    }

    const priceIncrease = configuration.priceIncrease ?? product.priceIncrease ?? 0
    const lampPriceIncrease = configuration.lampPriceIncrease ?? 0
    const discount = configuration.discount ?? product.discount ?? 0
    const shippingPrice = configuration.shippingPrice ?? 69
    const validQuantity = Math.max(1, Math.floor(quantity))

    // Same helper as the cart and the configure API (lib/pricing.ts).
    const pricing = priceLine({
      unitPrice: product.price,
      quantity: validQuantity,
      priceIncrease,
      lampPriceIncrease,
      discountRate: discount,
      shippingPrice,
    })
    const unitPriceAfterDiscount = roundMoney(
      money(pricing.subtotal).minus(pricing.discountAmount).dividedBy(validQuantity),
    ).toFixed(2)

    const order = await prisma.order.create({
      data: {
        userId: userId,
        configurationId: configId,
        productId: product.id,
        quantity: validQuantity,
        productPrice: product.price,
        discountRate: discount,
        discountedPrice: unitPriceAfterDiscount,
        totalPrice: pricing.total,
        configPrice: pricing.subtotal,
        priceIncrease: priceIncrease,
        productName: product.productName,
        productImages: product.productImages,
        status: "awaiting_shipment",
        shippingPrice: shippingPrice,
        shippingAddressId: shippingAddress.id,
        productColorTemp: product.productColor || "",
        productIp: configuration.productIp?.toString() || product.productIp?.toString() || "IP20",
        productChandLamp: product.productChandLamp || "",
        brand: product.brand,
        chandelierLightingType: product.chandelierLightingType,
      },
    })

    console.log("Order created successfully", {
      userId: userId,
      orderId: order.id,
      productId: product.id,
    })

    return { userId: userId, orderId: order.id, productId: product.id }
  } catch (error) {
    console.error("Error in createOrder:", error)
    throw error
  }
}