"use server"

import { auth } from "@/lib/auth-server"
import { CheckoutError, placeOrder } from "@/lib/checkout.server"
import { getLocale } from "next-intl/server"

/**
 * "Order now" on one product: an order with a single line, placed through
 * the same checkout as the cart (lib/checkout.server), so a product costs
 * the same bought alone or with others, and the order is created once —
 * the address step no longer writes a second one.
 */
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
  const { userId } = await auth()
  if (!userId) {
    // The client matches on "logged in" to open the sign-in dialog.
    throw new Error("You need to be logged in")
  }

  try {
    const orderId = await placeOrder(
      userId,
      { kind: "configuration", configurationId: configId, quantity },
      { coupon: coupon ?? null, customerLanguage: (await getLocale()) === "en" ? "en" : "ar" },
    )
    return { userId, orderId }
  } catch (error) {
    if (error instanceof CheckoutError) throw new Error(`Checkout failed: ${error.code}`)
    throw error
  }
}
