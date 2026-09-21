import { auth } from "@/lib/auth-server"
import { orderForCustomer, toOrderView } from "@/lib/checkout.server"
import { NextRequest, NextResponse } from "next/server"

/** The caller's own order, as the order pages render it (lib/order-view). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orderId = parseInt((await params).orderId, 10)
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
  }

  try {
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar"
    const order = await orderForCustomer(orderId, userId, locale)
    // Missing and not-yours answer the same, so ids can't be probed.
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    return NextResponse.json(toOrderView(order, locale))
  } catch (error) {
    console.error("Failed to fetch order", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}
