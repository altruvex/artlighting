"use server";

import * as catalog from "@repo/catalog";
import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, run } from "./result";

/**
 * Inventory actions. Every one goes through @repo/catalog, so the ledger
 * row and the number it explains are written in the same transaction
 * whichever door the change comes in by.
 */

const MAX_QUANTITY = 1_000_000;

function quantityOrThrow(quantity: number, message: string, allowNegative = false): number {
  if (!Number.isInteger(quantity)) throw new ActionError(message);
  if (Math.abs(quantity) > MAX_QUANTITY) throw new ActionError(message);
  if (!allowNegative && quantity <= 0) throw new ActionError(message);
  return quantity;
}

/** Stock arrived from a supplier. */
export async function receiveStock(variantId: string, quantity: number, reason?: string) {
  return run(async () => {
    const admin = await requirePermission("product:write");
    const t = await getTranslations("Inventory.errors");
    quantityOrThrow(quantity, t("quantityInvalid"));

    const level = await catalog.receiveStock(variantId, quantity, admin.id, reason);
    revalidatePath("/admin/dashboard/inventory");
    return level;
  });
}

/**
 * A stock count. The admin types what is on the shelf, not the difference —
 * asking them for the difference is asking them to make the arithmetic
 * mistake.
 */
export async function setCountedStock(variantId: string, countedOnHand: number, reason?: string) {
  return run(async () => {
    const admin = await requirePermission("product:write");
    const t = await getTranslations("Inventory.errors");
    if (!Number.isInteger(countedOnHand) || countedOnHand < 0 || countedOnHand > MAX_QUANTITY) {
      throw new ActionError(t("quantityInvalid"));
    }

    try {
      const level = await catalog.setCountedStock(variantId, countedOnHand, admin.id, reason);
      revalidatePath("/admin/dashboard/inventory");
      // Null means the count agreed with the system; nothing was written.
      return level;
    } catch (error) {
      if (error instanceof catalog.InsufficientStockError) {
        // Counting below what is already promised to orders would leave the
        // warehouse owing units it does not have.
        throw new ActionError(t("belowReserved", { reserved: error.available }));
      }
      throw error;
    }
  });
}

/** The ledger for one variant, newest first. */
export async function stockHistory(variantId: string) {
  return run(async () => {
    await requirePermission("catalog:read");
    return catalog.movementHistory(variantId, 50);
  });
}

/** What the admin should reorder. */
export async function lowStockReport() {
  return run(async () => {
    await requirePermission("catalog:read");
    return catalog.lowStock();
  });
}
