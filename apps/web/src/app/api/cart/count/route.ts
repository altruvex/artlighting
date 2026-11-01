import { auth } from "@/lib/auth-server";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";

/**
 * How many units the signed-in customer's cart holds — the number on the
 * header badge. One aggregate, no products, no images, no pricing: the
 * badge used to load the whole priced cart on every page to show it.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { _sum } = await prisma.cartItem.aggregate({
      where: { cart: { userId } },
      _sum: { quantity: true },
    });
    return NextResponse.json({ count: _sum.quantity ?? 0 });
  } catch (error) {
    console.error("Failed to count cart items:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
