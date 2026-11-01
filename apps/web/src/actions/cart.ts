"use server";

import { auth } from "@/lib/auth-server";
import { limitAction } from "@/middleware/ratelimit";
import { prisma } from "@repo/database";

/** Same cap as the cart's PATCH (app/api/cart): one line can't be inflated into an absurd order. */
const MAX_QUANTITY = 100;

export async function addToCart(productId: string, quantity: number = 1) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }
  if (!(await limitAction("write", userId))) {
    throw new Error("Too many requests");
  }
  // A server action is a public endpoint: a zero, negative or fractional
  // quantity would become a negative order line (and a negative stock
  // reservation) at checkout.
  if (typeof productId !== "string" || productId.length === 0 || productId.length > 120) {
    throw new Error("Invalid product");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error("Invalid quantity");
  }
  try {
    // The User row already exists once `userId` is a valid session's user id
    // — Better Auth writes it directly to this table at sign-up.
    const product = await prisma.product.findUnique({
      where: { productId },
      select: { id: true, isActive: true },
    });
    if (!product) {
      throw new Error("Product not found");
    }
    // A retired product cannot be added: checkout would refuse the cart
    // anyway (CheckoutError "unavailable"), with every line held hostage.
    if (!product.isActive) {
      throw new Error("Product is not available");
    }
    let cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    }
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: product.id,
        },
      },
      select: { id: true, quantity: true },
    });
    if (existingCartItem) {
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: Math.min(MAX_QUANTITY, existingCartItem.quantity + quantity) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity,
        },
      });
    }
    return { success: true, message: "Product added to cart" };
  } catch (error) {
    console.error("Failed to add item to cart:", error);
    throw error;
  }
}
