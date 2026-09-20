"use server";

import * as catalog from "@repo/catalog";
import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, run } from "./result";

/**
 * The bulb catalogue and which fixtures offer which bulbs.
 *
 * Writing goes through @repo/catalog so the admin and the storefront agree
 * on the arithmetic: the price a fixture shows is the bulb's price times
 * its arms, computed in one place.
 *
 * Gated on `price:write` rather than `product:write` — this is a price
 * list, and changing a number here moves the price of 47 fixtures at once.
 */

const PATH = "/admin/dashboard/bulbs";

async function asActionError<T>(fn: () => Promise<T>): Promise<T> {
  const t = await getTranslations("Bulbs.errors");
  try {
    return await fn();
  } catch (error) {
    if (error instanceof catalog.BulbInUseError) {
      throw new ActionError(
        t("inUse", { products: error.products, configurations: error.configurations }),
      );
    }
    // A duplicate key is the admin typing a key that already exists, not a
    // crash: name it rather than letting Prisma's constraint text through.
    if (
      error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new ActionError(t("duplicateKey"));
    }
    // A zod failure is a mistake in the form. Its messages are already
    // sentences (see @repo/catalog schemas), so the first one is what to show.
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues: { message: string }[] }).issues;
      if (issues?.[0]) throw new ActionError(issues[0].message);
    }
    throw error;
  }
}

export async function createBulb(input: catalog.BulbInput) {
  return run(async () => {
    await requirePermission("price:write");
    await asActionError(() => catalog.createBulb(input));
    revalidatePath(PATH);
  });
}

export async function updateBulb(id: string, input: catalog.BulbInput) {
  return run(async () => {
    await requirePermission("price:write");
    await asActionError(() => catalog.updateBulb(id, input));
    revalidatePath(PATH);
  });
}

export async function setBulbActive(id: string, isActive: boolean) {
  return run(async () => {
    await requirePermission("price:write");
    await asActionError(() => catalog.setBulbActive(id, isActive));
    revalidatePath(PATH);
  });
}

export async function deleteBulb(id: string) {
  return run(async () => {
    await requirePermission("price:write");
    await asActionError(() => catalog.deleteBulbIfUnused(id));
    revalidatePath(PATH);
  });
}

export async function setProductBulbs(
  productId: string,
  bulbIds: string[],
  defaultBulbId: string | null,
) {
  return run(async () => {
    await requirePermission("price:write");
    const t = await getTranslations("Bulbs.errors");
    if (bulbIds.length > 0 && !defaultBulbId) {
      throw new ActionError(t("defaultRequired"));
    }
    await asActionError(() => catalog.setProductBulbs(productId, bulbIds, defaultBulbId));
    revalidatePath(PATH);
    revalidatePath(`/admin/dashboard/products/${productId}`);
  });
}
