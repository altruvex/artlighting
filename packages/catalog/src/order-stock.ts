import type { OrderStatus } from "@repo/database";
import { prisma, type Db } from "./client";
import { recordMovement, type StockMovementKind } from "./inventory";

/**
 * Orders move stock.
 *
 * The inventory service could reserve, release, sell and return units, and
 * nothing called it: an order confirmed, shipped or cancelled and the stock
 * counts never heard. A product with two units left could be sold to ten
 * customers, and "available" on the product page counted units that had
 * already been promised.
 *
 * An order's status says where its units should be, and this function puts
 * them there:
 *
 *   awaiting_shipment, processing   reserved — promised, still in the building
 *   shipped, delivered, fulfilled   sold — gone, and the reservation with them
 *   cancelled, refunded             released — if they never left
 *
 * A product marked untracked (Product.trackInventory = false) is made or
 * bought in to order, so no status holds or sells its stock; a reservation
 * it held from before it was untracked is given back the next time its
 * order moves.
 *
 * A cancelled or refunded order that had already shipped is left as sold.
 * A refund is not proof the goods came back; when they do, that is a
 * return an admin records, not something a status change should assume.
 *
 * What the order already did to stock is read from the ledger — its own
 * movements, by kind — not from a flag on the order. So running this twice,
 * or moving an order back to a status it had before, applies only the
 * difference: nothing is reserved or sold twice.
 */

export type StockStage = "reserved" | "sold" | "released";

export function stageFor(status: OrderStatus): StockStage {
  switch (status) {
    case "awaiting_shipment":
    case "processing":
      return "reserved";
    case "shipped":
    case "delivered":
    case "fulfilled":
      return "sold";
    case "cancelled":
    case "refunded":
      return "released";
  }
}

/** Where an order's units of one variant stand, from its own ledger rows. */
export interface VariantPosition {
  /** Units currently promised to this order. */
  reserved: number;
  /** Units this order took out of the building and did not bring back. */
  sold: number;
}

/**
 * From the order's movements of one variant (signed quantities, as the
 * ledger stores them) to its position. RESERVE +q, RELEASE −q and SALE −q
 * move the promise; SALE −q and RETURN +q move what left.
 */
export function positionFrom(movements: { kind: string; quantity: number }[]): VariantPosition {
  let reserved = 0;
  let sold = 0;
  for (const { kind, quantity } of movements) {
    const units = Math.abs(quantity);
    if (kind === "RESERVE") reserved += units;
    else if (kind === "RELEASE") reserved -= units;
    else if (kind === "SALE") {
      reserved -= units;
      sold += units;
    } else if (kind === "RETURN") sold -= units;
  }
  return { reserved: Math.max(0, reserved), sold: Math.max(0, sold) };
}

/**
 * The movements that take one variant from where it stands to where the
 * stage wants it, in the order they must run. Pure, so every transition —
 * including an admin undoing a mistake — is tested without a database.
 */
export function movementsFor(
  stage: StockStage,
  quantity: number,
  position: VariantPosition,
): { kind: Extract<StockMovementKind, "RESERVE" | "RELEASE" | "SALE" | "RETURN">; quantity: number }[] {
  const steps: ReturnType<typeof movementsFor> = [];
  const { sold } = position;
  let { reserved } = position;

  if (stage === "reserved") {
    // Back from shipped — an admin correcting a status. The units return to
    // the building before they are promised again.
    if (sold > 0) steps.push({ kind: "RETURN", quantity: sold });
    if (reserved < quantity) steps.push({ kind: "RESERVE", quantity: quantity - reserved });
    if (reserved > quantity) steps.push({ kind: "RELEASE", quantity: reserved - quantity });
    return steps;
  }

  if (stage === "sold") {
    const toShip = quantity - sold;
    if (toShip > 0) {
      // A sale consumes a reservation. An order confirmed before orders
      // reserved stock has none, so it takes one first — which is also
      // where an oversell is refused.
      if (reserved < toShip) {
        steps.push({ kind: "RESERVE", quantity: toShip - reserved });
        reserved = toShip;
      }
      steps.push({ kind: "SALE", quantity: toShip });
      reserved -= toShip;
    }
    if (reserved > 0) steps.push({ kind: "RELEASE", quantity: reserved });
    return steps;
  }

  // Released: give back what is still promised; leave what has left alone.
  if (reserved > 0) steps.push({ kind: "RELEASE", quantity: reserved });
  return steps;
}

/**
 * Puts an order's stock where its status says it should be. Runs inside the
 * caller's transaction — the status change and the stock move together or
 * not at all — and throws InsufficientStockError, naming the SKU, rather
 * than oversell.
 */
export async function syncOrderStock(
  orderId: number,
  status: OrderStatus,
  actorId: string,
  tx: Db = prisma,
): Promise<void> {
  // One order at a time: two status changes racing on the same order would
  // each read the ledger before the other wrote to it.
  await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;

  const lines = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      productId: true,
      productVariantId: true,
      quantity: true,
      product: { select: { trackInventory: true } },
    },
  });
  if (lines.length === 0) return;

  // A line placed before lines named their variant gets its product's
  // default one, written back so the next sync reads the same variant.
  const needVariant = lines.filter((line) => !line.productVariantId).map((line) => line.productId);
  const defaults = needVariant.length
    ? await tx.productVariant.findMany({
        where: { productId: { in: needVariant }, isDefault: true },
        select: { id: true, productId: true },
      })
    : [];
  const defaultByProduct = new Map(defaults.map((variant) => [variant.productId, variant.id]));

  const quantityByVariant = new Map<string, number>();
  const untracked = new Set<string>();
  for (const line of lines) {
    const variantId = line.productVariantId ?? defaultByProduct.get(line.productId);
    if (!variantId) {
      throw new Error(`Order ${orderId}: product ${line.productId} has no default variant to take stock from`);
    }
    if (!line.productVariantId) {
      await tx.orderItem.update({ where: { id: line.id }, data: { productVariantId: variantId } });
    }
    quantityByVariant.set(variantId, (quantityByVariant.get(variantId) ?? 0) + line.quantity);
    if (!line.product.trackInventory) untracked.add(variantId);
  }

  const movements = await tx.stockMovement.findMany({
    where: { orderId, item: { variantId: { in: [...quantityByVariant.keys()] } } },
    select: { kind: true, quantity: true, item: { select: { variantId: true } } },
  });

  const stage = stageFor(status);
  for (const [variantId, quantity] of quantityByVariant) {
    const position = positionFrom(movements.filter((movement) => movement.item.variantId === variantId));
    // Untracked: hold nothing. "released" gives back anything still
    // promised and leaves what already left as it is.
    const target = untracked.has(variantId) ? "released" : stage;
    for (const step of movementsFor(target, quantity, position)) {
      await recordMovement(
        { variantId, kind: step.kind, quantity: step.quantity, orderId, actorId, reason: `order ${orderId}: ${status}` },
        tx,
      );
    }
  }
}
