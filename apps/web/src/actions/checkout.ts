"use server";

import { auth } from "@/lib/auth-server";
import { CheckoutError, completeOrder, placeOrder, saveShippingAddress } from "@/lib/checkout.server";
import { z } from "zod";

/**
 * The storefront's two ways into checkout, and the address step.
 *
 * Every action answers with a result, not a thrown error: a server action's
 * thrown message is replaced by a generic one in production, and the
 * customer needs to know the difference between "your cart is empty" and
 * "sign in first".
 */

type Result<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: "signed_out" | "empty" | "unavailable" | "not_found" | "invalid" | "failed" | "out_of_stock";
      /** For out_of_stock: which product ran short, and how many are left. */
      detail?: { product: string; available: number };
    };

function failure(error: unknown): Result<never> {
  if (error instanceof CheckoutError) {
    return { ok: false, error: error.code === "not_yours" ? "not_found" : error.code, detail: error.detail };
  }
  console.error("Checkout failed:", error);
  return { ok: false, error: "failed" };
}

/** Everything in the cart, as one order. */
export async function checkoutCart(locale: string): Promise<Result<{ orderId: number }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "signed_out" };
  try {
    const orderId = await placeOrder(userId, { kind: "cart" }, { customerLanguage: locale === "en" ? "en" : "ar" });
    return { ok: true, value: { orderId } };
  } catch (error) {
    return failure(error);
  }
}

const AddressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().min(6).max(30),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  zipCode: z.string().trim().max(20),
  country: z.string().trim().min(1).max(80),
});

/** The address step: saves the address onto the order already placed. */
export async function submitShippingAddress(orderId: number, input: unknown): Promise<Result<{ orderId: number }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "signed_out" };

  const parsed = AddressSchema.safeParse(input);
  if (!parsed.success || !Number.isInteger(orderId)) return { ok: false, error: "invalid" };

  try {
    const saved = await saveShippingAddress(orderId, userId, parsed.data);
    return saved ? { ok: true, value: { orderId } } : { ok: false, error: "not_found" };
  } catch (error) {
    return failure(error);
  }
}

/** The customer confirms the order; what it bought leaves their cart with it. */
export async function confirmOrder(orderId: number): Promise<Result<{ orderId: number }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "signed_out" };
  if (!Number.isInteger(orderId)) return { ok: false, error: "invalid" };
  try {
    return (await completeOrder(orderId, userId)) ? { ok: true, value: { orderId } } : { ok: false, error: "not_found" };
  } catch (error) {
    return failure(error);
  }
}
