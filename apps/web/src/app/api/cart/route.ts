import { auth } from "@/lib/auth-server";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { computePricing } from "@repo/pricing";
import { money, multiplyMoney, roundMoney, serializeMoney } from "@repo/money";
import { discountsForCart, toCartLine } from "@repo/catalog";

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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { images: productImageSelect() } },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json([]);
    }

    // The whole cart through the engine, not each line on its own: a
    // cart-scoped promotion or a minimum order only means anything when
    // the lines are priced together.
    const rules = await discountsForCart(null, prisma);
    const priced = computePricing({
      lines: cart.items.map((item) =>
        toCartLine(item.product, { id: item.id, quantity: item.quantity }),
      ),
      discounts: rules,
      customer: { userId },
      now: new Date(),
    });
    const byLine = new Map(priced.lines.map((line) => [line.id, line]));

    const cartItems = cart.items.map((item) => {
      const line = byLine.get(item.id);
      const lineDiscount = money(line?.discount ?? 0);
      const lineSubtotal = multiplyMoney(item.product.price, item.quantity);
      return {
        id: item.id,
        productId: item.product.productId,
        productName: item.product.productName,
        quantity: item.quantity,
        price: serializeMoney(item.product.price),
        unitPriceAfterDiscount: serializeMoney(
          roundMoney(money(line?.total ?? lineSubtotal).dividedBy(Math.max(1, item.quantity))),
        ),
        totalPrice: line?.total ?? serializeMoney(lineSubtotal),
        productImages: imageUrls(item.product),
        // The effective rate for this line, from the engine.
        discount: lineSubtotal.isZero() ? "0" : lineDiscount.dividedBy(lineSubtotal).toFixed(4),
        sectionType: item.product.sectionType,
        spotlightType: item.product.spotlightType,
        brand: item.product.brand,
      };
    });

    return NextResponse.json(cartItems);
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Add PATCH method for updating quantity
export async function PATCH(request: NextRequest) {
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

    // Check if cart exists and user owns the item
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { id: itemId },
          include: { product: { include: { images: productImageSelect() } } }
        }
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Update the cart item quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: { include: { images: productImageSelect() } } },
    });

    // Through the engine, like the GET above: the line's price is whatever
    // the promotions say it is, not a rate on the product row.
    const rules = await discountsForCart(null, prisma);
    const priced = computePricing({
      lines: [toCartLine(updatedItem.product, { id: updatedItem.id, quantity: updatedItem.quantity })],
      discounts: rules,
      customer: { userId },
      now: new Date(),
    });
    const pricedLine = priced.lines[0]!;
    const totalPrice = pricedLine.total;
    const lineSubtotal = multiplyMoney(updatedItem.product.price, updatedItem.quantity);

    return NextResponse.json({
      id: updatedItem.id,
      productId: updatedItem.product.productId,
      productName: updatedItem.product.productName,
      quantity: updatedItem.quantity,
      price: updatedItem.product.price.toFixed(2),
      totalPrice,
      productImages: imageUrls(updatedItem.product),
      discount: lineSubtotal.isZero() ? "0" : money(pricedLine.discount).dividedBy(lineSubtotal).toFixed(4),
      sectionType: updatedItem.product.sectionType,
      spotlightType: updatedItem.product.spotlightType,
      brand: updatedItem.product.brand,
    });
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Keep existing PUT method for compatibility
export async function PUT(request: NextRequest) {
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

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { images: productImageSelect() } } } } },
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const cartItem = cart.items.find((item) => item.id === itemId);
    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 },
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: { include: { images: productImageSelect() } } },
    });

    // Through the engine, like the other two handlers.
    const rules = await discountsForCart(null, prisma);
    const priced = computePricing({
      lines: [toCartLine(updatedItem.product, { id: updatedItem.id, quantity: updatedItem.quantity })],
      discounts: rules,
      customer: { userId },
      now: new Date(),
    });
    const pricedLine = priced.lines[0]!;
    const lineSubtotal = multiplyMoney(updatedItem.product.price, updatedItem.quantity);

    return NextResponse.json({
      id: updatedItem.id,
      productId: updatedItem.product.productId,
      productName: updatedItem.product.productName,
      quantity: updatedItem.quantity,
      price: serializeMoney(updatedItem.product.price),
      totalPrice: pricedLine.total,
      productImages: imageUrls(updatedItem.product),
      discount: lineSubtotal.isZero() ? "0" : money(pricedLine.discount).dividedBy(lineSubtotal).toFixed(4),
      sectionType: updatedItem.product.sectionType,
      spotlightType: updatedItem.product.spotlightType,
      brand: updatedItem.product.brand,
    });
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

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
    const { itemId } = parsed.data;

    // Verify the item belongs to the user's cart before deleting
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { id: itemId }
        }
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove cart item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}