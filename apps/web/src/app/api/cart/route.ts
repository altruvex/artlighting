import { auth } from "@/lib/auth-server";
import { cartDrafts, configuredUnitPrice, priceDrafts } from "@/lib/checkout.server";
import { imageUrls } from "@/lib/product-images";
import { money, multiplyMoney } from "@repo/money";

import { prisma } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** Upper bound so a single line can't be inflated into an absurd order. */
const MAX_QUANTITY = 100;

const CartItemQuantitySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive().max(MAX_QUANTITY),
});

const CartItemSchema = z.object({ itemId: z.string().min(1) });

/**
 * The cart, priced exactly as checkout will price it.
 *
 * All lines go through the engine together, with the unit each customer
 * configured — the same drafts and the same call placeOrder uses — so the
 * drawer's total is the order's total before shipping. It used to price
 * the base product with no bulb or IP upgrade, and to price lines one by
 * one while PATCH did something else again.
 */
async function pricedCart(userId: string) {
  const drafts = await cartDrafts(userId);
  if (drafts.length === 0) return [];
  const priced = await priceDrafts(drafts, { userId });
  const byKey = new Map(priced.lines.map((line) => [line.id, line]));

  return drafts.map((draft) => {
    const line = byKey.get(draft.key)!;
    const unit = configuredUnitPrice(draft.product, draft.configuration);
    const lineSubtotal = multiplyMoney(unit, draft.quantity);
    return {
      id: draft.key,
      productId: draft.product.productId,
      productName: draft.product.productName,
      quantity: draft.quantity,
      /** One unit as configured, before discounts. */
      price: unit,
      totalPrice: line.total,
      productImages: imageUrls(draft.product),
      // The effective rate for this line, from the engine.
      discount: lineSubtotal.isZero() ? "0" : money(line.discount).dividedBy(lineSubtotal).toFixed(4),
      sectionType: draft.product.sectionType,
      spotlightType: draft.product.spotlightType,
      brand: draft.product.brand,
    };
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await pricedCart(userId));
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Sets a line's quantity, and answers with that line repriced alongside the rest. */
async function updateQuantity(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = CartItemQuantitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    const { itemId, quantity } = parsed.data;

    // Scoped to the caller's cart: another customer's item id updates nothing.
    const { count } = await prisma.cartItem.updateMany({
      where: { id: itemId, cart: { userId } },
      data: { quantity },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    const line = (await pricedCart(userId)).find((item) => item.id === itemId);
    return NextResponse.json(line);
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const PATCH = updateQuantity;
// Kept for older clients that still send PUT.
export const PUT = updateQuantity;

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = CartItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { count } = await prisma.cartItem.deleteMany({
      where: { id: parsed.data.itemId, cart: { userId } },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove cart item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
