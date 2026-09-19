"use server";

import { prisma } from "@repo/database";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { run } from "./result";

export async function createCategory(data: {
  name: string;
  slug: string;
  parentId?: string | null;
}) {
  return run(async () => {
    await requireAdmin();
    const count = await prisma.category.count({ where: { parentId: data.parentId ?? null } });
    const category = await prisma.category.create({
      data: { name: data.name, slug: data.slug, parentId: data.parentId ?? null, order: count },
    });
    revalidatePath("/admin/dashboard/categories");
    return category;
  });
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; slug?: string; isActive?: boolean }
) {
  return run(async () => {
    await requireAdmin();
    const category = await prisma.category.update({ where: { id: categoryId }, data });
    revalidatePath("/admin/dashboard/categories");
    return category;
  });
}

/**
 * Moves a category up or down among its siblings (same parentId), swapping
 * `order` values. Plain up/down controls rather than mouse drag-and-drop —
 * no drag library was already present in this app, and adding one blind
 * (untested drag interactions) was a worse tradeoff than an accessible,
 * unambiguous control that does the same job.
 */
export async function moveCategory(categoryId: string, direction: "up" | "down") {
  return run(async () => {
    await requireAdmin();

    const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    const siblings = await prisma.category.findMany({
      where: { parentId: category.parentId },
      orderBy: { order: "asc" },
    });

    const index = siblings.findIndex((s) => s.id === categoryId);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return category;

    await prisma.$transaction([
      prisma.category.update({ where: { id: category.id }, data: { order: swapWith.order } }),
      prisma.category.update({ where: { id: swapWith.id }, data: { order: category.order } }),
    ]);

    revalidatePath("/admin/dashboard/categories");
    return category;
  });
}
