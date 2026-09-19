"use server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@repo/database";

export const getUserStatus = async ({ orderId }: { orderId: number }) => {
  try {
    const { userId } =  await auth();
    if (!userId) {
      console.log("User Not authenticated");
      throw new Error("You need to be logged in");
    }
    // Scoped by userId: another customer's order and a non-existent one
    // fail identically, so order ids can't be probed by the error text.
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: true,
        shippingAddress: true,
        configuration: true,
      },
    });
    if (!order) {
      throw new Error("Order not found");
    }
    return order;
  } catch (error) {
    console.log("Error in getUserStatus", error);
    throw error;
  }
};