import { auth } from "@/lib/auth-server";
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
            product: true,
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json([]);
    }

    const cartItems = cart.items.map((item) => ({
      id: item.id,
      productId: item.product.productId,
      productName: item.product.productName,
      quantity: item.quantity,
      price: item.product.price,
      totalPrice: item.product.price * item.quantity * (1 - item.product.discount / 100),
      productImages: item.product.productImages,
      discount: item.product.discount,
      sectionType: item.product.sectionType,
      spotlightType: item.product.spotlightType,
      brand: item.product.brand,
    }));

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
          include: { product: true }
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
      include: { product: true },
    });

    // Calculate total price with discount
    const totalPrice = updatedItem.product.price * updatedItem.quantity * (1 - updatedItem.product.discount / 100);

    return NextResponse.json({
      id: updatedItem.id,
      productId: updatedItem.product.productId,
      productName: updatedItem.product.productName,
      quantity: updatedItem.quantity,
      price: updatedItem.product.price,
      totalPrice,
      productImages: updatedItem.product.productImages,
      discount: updatedItem.product.discount,
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
      include: { items: { include: { product: true } } },
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
      include: { product: true },
    });

    const totalPrice = updatedItem.product.price * updatedItem.quantity * (1 - updatedItem.product.discount / 100);

    return NextResponse.json({
      id: updatedItem.id,
      productId: updatedItem.product.productId,
      productName: updatedItem.product.productName,
      quantity: updatedItem.quantity,
      price: updatedItem.product.price,
      totalPrice,
      productImages: updatedItem.product.productImages,
      discount: updatedItem.product.discount,
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