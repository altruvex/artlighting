"use server";

import * as catalog from "@repo/catalog";
import { computePricing } from "@repo/pricing";
import { prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { serializeMoney } from "@repo/money";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront";
import { ActionError, run } from "./result";

/**
 * Discount actions. Writing goes through @repo/catalog and pricing through
 * @repo/pricing, so the preview below answers with exactly the arithmetic
 * the storefront will use.
 */

async function asActionError<T>(fn: () => Promise<T>): Promise<T> {
  const t = await getTranslations("Discounts.errors");
  try {
    return await fn();
  } catch (error) {
    if (error instanceof catalog.DuplicateCouponCodeError) {
      throw new ActionError(t("duplicateCode", { code: error.code }));
    }
    // A zod failure is the admin's mistake, not a crash: surface the first
    // message rather than an opaque digest.
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues: { message: string }[] }).issues;
      if (issues?.[0]) throw new ActionError(issues[0].message);
    }
    throw error;
  }
}

export async function createDiscount(input: catalog.DiscountInput) {
  return run(async () => {
    await requirePermission("discount:write");
    const discount = await asActionError(() => catalog.createDiscount(input));
    revalidateStorefront();
    revalidatePath("/dashboard/discounts");
    return { id: discount.id };
  });
}

export async function updateDiscount(discountId: string, input: catalog.DiscountInput) {
  return run(async () => {
    await requirePermission("discount:write");
    const discount = await asActionError(() => catalog.updateDiscount(discountId, input));
    revalidateStorefront();
    revalidatePath("/dashboard/discounts");
    return { id: discount.id };
  });
}

/**
 * Stopping a discount is reversible and deliberately not a delete: its
 * redemptions are what explain past orders, so the row has to stay.
 */
export async function setDiscountActive(discountId: string, isActive: boolean) {
  return run(async () => {
    await requirePermission("discount:write");
    await catalog.setDiscountActive(discountId, isActive);
    revalidateStorefront();
    revalidatePath("/dashboard/discounts");
  });
}

/**
 * "What would this cart pay." Runs the real engine over a cart the admin
 * builds, so a promotion can be checked before customers meet it — and
 * shows the discounts that did *not* apply, with the reason, which is the
 * half that is hard to work out by reading the rules.
 */
export async function previewCart(input: { productId: string; quantity: number; coupon?: string | null }) {
  return run(async () => {
    await requirePermission("catalog:read");
    const t = await getTranslations("Discounts.errors");

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, productName: true, price: true, categoryId: true, lightingtypeId: true },
    });
    if (!product) throw new ActionError(t("productNotFound"));

    const quantity = Math.max(1, Math.min(999, Math.trunc(input.quantity) || 1));
    const rules = await catalog.discountsForCart(input.coupon ?? null, prisma, {
      // The preview lists not-started and expired rules too, with their reason.
      at: null,
    });

    return {
      productName: product.productName,
      quantity,
      result: computePricing({
        lines: [
          {
            id: "preview",
            productId: product.id,
            categoryIds: [product.categoryId, product.lightingtypeId],
            unitPrice: serializeMoney(product.price),
            quantity,
          },
        ],
        discounts: rules,
        coupon: input.coupon ?? null,
        now: new Date(),
      }),
    };
  });
}
