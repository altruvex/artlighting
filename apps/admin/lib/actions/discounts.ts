"use server";

import { prisma } from "@repo/database";
import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { DiscountScope, DiscountType } from "@repo/database";

export async function createDiscount(data: {
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  code?: string | null;
  productId?: string | null;
  categoryId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  await requireOwner();

  if (data.scope === "product" && !data.productId) {
    const t = await getTranslations("Discounts");
    throw new Error(t("errors.productRequired"));
  }
  if (data.scope === "category" && !data.categoryId) {
    const t = await getTranslations("Discounts");
    throw new Error(t("errors.categoryRequired"));
  }

  const discount = await prisma.discount.create({
    data: {
      type: data.type,
      scope: data.scope,
      value: data.value,
      code: data.code || null,
      productId: data.scope === "product" ? data.productId : null,
      categoryId: data.scope === "category" ? data.categoryId : null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
    },
  });

  revalidatePath("/admin/dashboard/discounts");
  if (data.productId) revalidatePath(`/admin/dashboard/products/${data.productId}`);
  return discount;
}

export async function deactivateDiscount(discountId: string) {
  await requireOwner();
  const discount = await prisma.discount.update({
    where: { id: discountId },
    data: { isActive: false },
  });
  revalidatePath("/admin/dashboard/discounts");
  return discount;
}
