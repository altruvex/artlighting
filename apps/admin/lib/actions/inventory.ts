"use server";

import * as catalog from "@repo/catalog";
import { prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront";
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
    const admin = await requirePermission("stock:write");
    const t = await getTranslations("Inventory.errors");
    quantityOrThrow(quantity, t("quantityInvalid"));

    const level = await catalog.receiveStock(variantId, quantity, admin.id, reason);
    revalidateStorefront();
    revalidatePath("/dashboard/inventory");
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
    const admin = await requirePermission("stock:write");
    const t = await getTranslations("Inventory.errors");
    if (!Number.isInteger(countedOnHand) || countedOnHand < 0 || countedOnHand > MAX_QUANTITY) {
      throw new ActionError(t("quantityInvalid"));
    }

    try {
      const level = await catalog.setCountedStock(variantId, countedOnHand, admin.id, reason);
      revalidateStorefront();
      revalidatePath("/dashboard/inventory");
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

/**
 * The ledger for one variant, newest first, with the actor resolved to a
 * name.
 *
 * `actorId` holds an admin id, which is the right thing to store — a name
 * can change and a row must still point at the same person — but "who did
 * this" is unanswerable if the column shows a cuid.
 */
export async function stockHistory(variantId: string) {
  return run(async () => {
    await requirePermission("catalog:read");
    const movements = await catalog.movementHistory(variantId, 50);

    const adminIds = [...new Set(movements.map((m) => m.actorId).filter((id): id is string => Boolean(id) && id !== "system"))];
    const admins = adminIds.length
      ? await prisma.admin.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true } })
      : [];
    const nameById = new Map(admins.map((a) => [a.id, a.name?.trim() || a.email]));

    return movements.map((movement) => ({
      ...movement,
      // An admin who has since been removed keeps their id rather than
      // becoming blank: the ledger still has to account for the movement.
      // "system" is a stored sentinel, not an admin id, so it resolves to
      // null and the UI shows its own label for it.
      actorName:
        !movement.actorId || movement.actorId === "system"
          ? null
          : (nameById.get(movement.actorId) ?? movement.actorId),
    }));
  });
}
