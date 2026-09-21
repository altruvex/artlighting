"use server";

import { requireAdmin } from "@/lib/auth";
import { ActionError, run } from "@/lib/actions/result";
import { InsufficientStockError, syncOrderStock } from "@repo/catalog";
import { OrderStatus, prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";

/**
 * Changes an order's status, and moves its stock with it.
 *
 * This was a bare update: an order could be marked shipped, cancelled or
 * refunded and the stock counts never heard. Now the status and the stock
 * change in one transaction — shipping takes the units out of the building,
 * cancelling an unshipped order gives its reservation back — and a change
 * the stock cannot cover is refused, saying which SKU and by how much,
 * rather than recorded against units that are not there.
 *
 * A draft the customer never confirmed holds no stock, so only a confirmed
 * order's status moves any.
 */
export const changeOrderStatus = async ({
  id,
  newStatus,
}: {
  id: number;
  newStatus: OrderStatus;
}) =>
  run(async () => {
    // Server actions are public POST endpoints: authorize on every call.
    const admin = await requireAdmin();

    try {
      await prisma.$transaction(
        async (tx) => {
          const order = await tx.order.update({
            where: { id },
            data: { status: newStatus },
            select: { isCompleted: true },
          });
          if (order.isCompleted) {
            await syncOrderStock(id, newStatus, admin.id, tx);
          }
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        const t = await getTranslations("Orders");
        throw new ActionError(
          t("insufficientStock", { sku: error.sku, requested: error.requested, available: error.available }),
        );
      }
      throw error;
    }
  });
