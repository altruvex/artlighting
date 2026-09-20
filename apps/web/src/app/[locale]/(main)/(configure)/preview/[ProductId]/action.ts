"use server"

import { auth } from "@/lib/auth-server"
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { addMoney, money, roundMoney, serializeMoney } from "@repo/money"
import { computePricing } from "@repo/pricing"
import { discountsForCart, redeemDiscount, redemptionsByCustomer } from "@repo/catalog"
import { priceLine } from "@/lib/pricing"
import { prisma } from "@repo/database"

export async function createOrder({
  configId,
  quantity,
  coupon,
}: {
  configId: string
  quantity: number
  /** What the customer typed at checkout, if anything. */
  coupon?: string | null
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
      include: { images: productImageSelect() },
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
    const shippingPrice = configuration.shippingPrice ?? 69
    const validQuantity = Math.max(1, Math.floor(quantity))

    // The unit the customer is buying, before any promotion: the product
    // plus whatever the configuration added.
    const unitPrice = serializeMoney(addMoney(product.price, priceIncrease, lampPriceIncrease))

    // Priced by the engine, not by a rate on the product row — the same
    // function the admin previews with and the storefront displays from, so
    // the three cannot disagree about what this customer pays.
    const rules = await discountsForCart(coupon ?? null, prisma)
    const redemptions = await redemptionsByCustomer({ userId, email: dbUser.email }, prisma)
    const priced = computePricing({
      lines: [
        {
          id: "line",
          productId: product.id,
          categoryIds: [product.categoryId, product.lightingtypeId],
          unitPrice,
          quantity: validQuantity,
        },
      ],
      discounts: rules,
      coupon: coupon ?? null,
      customer: { userId, email: dbUser.email, redemptionsByDiscountId: redemptions },
      shipping: shippingPrice,
      now: new Date(),
    })

    const line = priced.lines[0]!
    const unitPriceAfterDiscount = roundMoney(money(line.total).dividedBy(validQuantity)).toFixed(2)
    // Kept on the order for the invoice: what fraction came off overall.
    const effectiveRate = money(priced.subtotal).isZero()
      ? "0"
      : money(priced.discountTotal).dividedBy(priced.subtotal).toFixed(4)

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
      data: {
        userId: userId,
        configurationId: configId,
        productId: product.id,
        quantity: validQuantity,
        productPrice: product.price,
        discountRate: effectiveRate,
        discountApplied: priced.applied.length > 0,
        discountedPrice: unitPriceAfterDiscount,
        totalPrice: priced.grandTotal,
        configPrice: priced.subtotal,
        priceIncrease: priceIncrease,
        productName: product.productName,
        // Snapshotted on the order, from the ProductImage table — see
        // lib/product-images.
        productImages: imageUrls(product),
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

      // Inside the same transaction as the order. A redemption recorded
      // against an order that then fails to save is a use nobody can
      // account for, and redeemDiscount locks the row before it reads the
      // count so two checkouts cannot share the last one.
      for (const applied of priced.applied) {
        await redeemDiscount(tx, {
          discountId: applied.discountId,
          orderId: created.id,
          userId,
          customerEmail: dbUser.email,
          amount: applied.amount,
        })
      }

      return created
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