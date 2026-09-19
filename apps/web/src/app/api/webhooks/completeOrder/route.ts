import { OrderService } from "@/lib/order.server";
import { auth } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CompleteOrderSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CompleteOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const order = await OrderService.completeOrder(parsed.data.orderId, userId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order }, { status: 200 });
  } catch (error) {
    console.error("Failed to complete order:", error);
    return NextResponse.json({ error: "Failed to complete order" }, { status: 500 });
  }
}
