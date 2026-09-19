import { OrderService } from "@/lib/order.server";
import { applyRateLimit } from "@/middleware/ratelimit";
import { auth } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateOrderSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productImages: z.array(z.string()),
  quantity: z.number().int().positive(),
  configPrice: z.number().positive(),
  productPrice: z.number().positive(),
  totalPrice: z.number().positive(),
  shippingMethod: z.string(),
  shippingPrice: z.number().min(0),
  configurationId: z.string(),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string(),
    country: z.string().min(1),
    phoneNumber: z.string().min(1),
  }),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting (5 orders per minute)
  const rateLimitResult = await applyRateLimit(request, "order");
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateOrderSchema.parse(body);

    const order = await OrderService.createOrder({
      userId,
      ...validatedData,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}