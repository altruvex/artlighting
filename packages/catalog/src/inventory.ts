import { prisma, type Db } from "./client";

/**
 * The inventory service. Every change to stock goes through here, and every
 * change writes a ledger row in the same transaction as the number it moved
 * — so `onHand` always has an explanation, and the explanation can never be
 * missing because someone updated the column directly.
 *
 * Two numbers are stored and one is computed:
 *   onHand    physically present, including whatever is promised
 *   reserved  promised to orders that have not shipped
 *   available = onHand - reserved, computed on read, never stored
 *
 * `available` is not a column on purpose. A third stored number is a third
 * thing that can drift from the two it is derived from, and it would have
 * to be recomputed correctly at six different call sites.
 */

export type StockMovementKind =
  | "RECEIPT"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT"
  | "RESERVE"
  | "RELEASE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export const DEFAULT_LOCATION_CODE = "main";

/** Raised instead of overselling. Carries what was asked for and what there is. */
export class InsufficientStockError extends Error {
  constructor(
    readonly sku: string,
    readonly requested: number,
    readonly available: number,
  ) {
    super(`Only ${available} of ${sku} available, ${requested} requested`);
    this.name = "InsufficientStockError";
  }
}

export interface StockLevel {
  itemId: string;
  variantId: string;
  sku: string;
  locationCode: string;
  onHand: number;
  reserved: number;
  /** onHand - reserved: what a customer may still buy. */
  available: number;
  incoming: number;
  reorderPoint: number | null;
  belowReorderPoint: boolean;
}

/** The default location, created on first use so no seed step is required. */
export async function defaultLocation(db: Db = prisma) {
  const existing = await db.inventoryLocation.findUnique({ where: { code: DEFAULT_LOCATION_CODE } });
  if (existing) return existing;

  return db.inventoryLocation.create({
    data: {
      code: DEFAULT_LOCATION_CODE,
      name: "Main warehouse",
      isDefault: true,
      translations: {
        create: [
          { language: "en", name: "Main warehouse" },
          { language: "ar", name: "المخزن الرئيسي" },
        ],
      },
    },
  });
}

/** The inventory row for a variant at a location, created empty if absent. */
async function itemFor(db: Db, variantId: string, locationId: string) {
  const existing = await db.inventoryItem.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
  });
  if (existing) return existing;
  return db.inventoryItem.create({ data: { variantId, locationId } });
}

interface MovementInput {
  variantId: string;
  kind: StockMovementKind;
  /** Always positive; `kind` decides which way it moves. */
  quantity: number;
  locationId?: string;
  reason?: string;
  orderId?: number;
  actorId?: string;
}

/**
 * How each kind moves the two numbers. Kept as a table rather than a switch
 * in the middle of the write, so adding a kind is one line here and the
 * arithmetic cannot be written differently in two places.
 *
 * A RESERVE moves only `reserved`: the units are still in the building, so
 * a stock count must still find them. A SALE is what actually removes them,
 * and it releases the reservation at the same time.
 */
export const EFFECT: Record<StockMovementKind, (quantity: number) => { onHand: number; reserved: number }> = {
  RECEIPT: (q) => ({ onHand: q, reserved: 0 }),
  RETURN: (q) => ({ onHand: q, reserved: 0 }),
  TRANSFER_IN: (q) => ({ onHand: q, reserved: 0 }),
  SALE: (q) => ({ onHand: -q, reserved: -q }),
  TRANSFER_OUT: (q) => ({ onHand: -q, reserved: 0 }),
  RESERVE: (q) => ({ onHand: 0, reserved: q }),
  RELEASE: (q) => ({ onHand: 0, reserved: -q }),
  // Signed by the caller: a count can go either way.
  ADJUSTMENT: (q) => ({ onHand: q, reserved: 0 }),
};

/**
 * Applies one movement and records it.
 *
 * Runs inside the caller's transaction when it is given one, so a sale that
 * also writes an order either does both or neither.
 */
export async function recordMovement(input: MovementInput, db: Db = prisma): Promise<StockLevel> {
  const { variantId, kind, reason, orderId, actorId } = input;
  const quantity = kind === "ADJUSTMENT" ? input.quantity : Math.abs(input.quantity);
  if (quantity === 0) throw new Error("A movement of zero is not an event");

  return runInTransaction(db, async (tx) => {
    const locationId = input.locationId ?? (await defaultLocation(tx)).id;
    const item = await itemFor(tx, variantId, locationId);

    const delta = EFFECT[kind](quantity);
    const onHand = item.onHand + delta.onHand;
    const reserved = item.reserved + delta.reserved;

    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { sku: true, productId: true },
    });

    // Checked here so the caller gets a useful error naming the SKU; the
    // database CHECK constraints are the backstop for anything that reaches
    // them another way.
    if (onHand < 0) {
      throw new InsufficientStockError(variant.sku, quantity, item.onHand);
    }
    if (reserved < 0) {
      throw new Error(`Cannot release ${quantity} of ${variant.sku}: only ${item.reserved} reserved`);
    }
    if (reserved > onHand) {
      throw new InsufficientStockError(variant.sku, quantity, item.onHand - item.reserved);
    }

    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: { onHand, reserved },
    });

    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        kind,
        // Signed, so a running total is a plain SUM.
        quantity: delta.onHand !== 0 ? delta.onHand : delta.reserved,
        onHandAfter: onHand,
        reservedAfter: reserved,
        reason: reason ?? null,
        orderId: orderId ?? null,
        actorId: actorId ?? "system",
      },
    });

    return {
      itemId: updated.id,
      variantId,
      sku: variant.sku,
      locationCode: DEFAULT_LOCATION_CODE,
      onHand: updated.onHand,
      reserved: updated.reserved,
      available: updated.onHand - updated.reserved,
      incoming: updated.incoming,
      reorderPoint: updated.reorderPoint,
      belowReorderPoint:
        updated.reorderPoint !== null && updated.onHand - updated.reserved <= updated.reorderPoint,
    };
  });
}

/** Stock arrived from a supplier. */
export function receiveStock(variantId: string, quantity: number, actorId: string, reason?: string, db?: Db) {
  return recordMovement({ variantId, kind: "RECEIPT", quantity, actorId, reason }, db);
}

/**
 * A stock count disagreed with the system and the count won.
 *
 * `countedOnHand` rather than a delta: an admin counts what is on the shelf,
 * and asking them to work out the difference is asking them to make the
 * arithmetic mistake.
 */
export async function setCountedStock(
  variantId: string,
  countedOnHand: number,
  actorId: string,
  reason?: string,
  db: Db = prisma,
): Promise<StockLevel | null> {
  return runInTransaction(db, async (tx) => {
    const locationId = (await defaultLocation(tx)).id;
    const item = await itemFor(tx, variantId, locationId);
    const delta = countedOnHand - item.onHand;
    if (delta === 0) return null;
    return recordMovement(
      { variantId, kind: "ADJUSTMENT", quantity: delta, locationId, actorId, reason },
      tx,
    );
  });
}

/** Promise units to an order that has not shipped. Refuses to oversell. */
export function reserveStock(variantId: string, quantity: number, orderId: number, db?: Db) {
  return recordMovement({ variantId, kind: "RESERVE", quantity, orderId }, db);
}

/** Give a reservation back, e.g. a cancelled order. */
export function releaseStock(variantId: string, quantity: number, orderId: number, db?: Db) {
  return recordMovement({ variantId, kind: "RELEASE", quantity, orderId }, db);
}

/** The units left the building with an order; the reservation goes with them. */
export function shipStock(variantId: string, quantity: number, orderId: number, actorId: string, db?: Db) {
  return recordMovement({ variantId, kind: "SALE", quantity, orderId, actorId }, db);
}

/** A customer sent it back. */
export function returnStock(variantId: string, quantity: number, orderId: number, actorId: string, db?: Db) {
  return recordMovement({ variantId, kind: "RETURN", quantity, orderId, actorId }, db);
}

/**
 * The Prisma select that yields a variant's sellable quantity.
 *
 * Every reader of stock uses this, so "available" means the same thing on
 * the product page, in the admin list and in an export: on hand minus what
 * is already promised to orders that have not shipped.
 */
export function inventorySelect() {
  return { select: { onHand: true, reserved: true } };
}

/** Sellable units from the rows `inventorySelect()` returns. */
export function availableFrom(
  inventory: { onHand: number; reserved: number }[] | null | undefined,
): number {
  if (!inventory || inventory.length === 0) return 0;
  // Summed across locations: a variant in two warehouses is one sellable
  // pool until picking has to care where it comes from.
  return inventory.reduce((total, row) => total + Math.max(0, row.onHand - row.reserved), 0);
}

/** Current levels for one variant, across every location it sits in. */
export async function stockFor(variantId: string, db: Db = prisma): Promise<StockLevel[]> {
  const items = await db.inventoryItem.findMany({
    where: { variantId },
    include: { variant: { select: { sku: true } }, location: { select: { code: true } } },
  });

  return items.map((item) => ({
    itemId: item.id,
    variantId,
    sku: item.variant.sku,
    locationCode: item.location.code,
    onHand: item.onHand,
    reserved: item.reserved,
    available: item.onHand - item.reserved,
    incoming: item.incoming,
    reorderPoint: item.reorderPoint,
    belowReorderPoint: item.reorderPoint !== null && item.onHand - item.reserved <= item.reorderPoint,
  }));
}

/**
 * Everything at or below its reorder point — the admin's restock list.
 *
 * Falls back to the product's lowStockThreshold when the item has no
 * reorder point of its own, so a product that was never configured still
 * appears rather than silently never warning.
 */
export async function lowStock(db: Db = prisma) {
  const items = await db.inventoryItem.findMany({
    include: {
      variant: { select: { sku: true, product: { select: { id: true, productId: true, productName: true, lowStockThreshold: true } } } },
      location: { select: { code: true } },
    },
  });

  return items
    .map((item) => {
      const threshold = item.reorderPoint ?? item.variant.product.lowStockThreshold;
      const available = item.onHand - item.reserved;
      return {
        productId: item.variant.product.id,
        productName: item.variant.product.productName,
        sku: item.variant.sku,
        locationCode: item.location.code,
        available,
        incoming: item.incoming,
        threshold,
        reorderQuantity: item.reorderQuantity,
        below: available <= threshold,
      };
    })
    .filter((row) => row.below)
    .sort((a, b) => a.available - b.available);
}

/** The ledger for one variant, newest first. */
export async function movementHistory(variantId: string, limit = 50, db: Db = prisma) {
  return db.stockMovement.findMany({
    where: { item: { variantId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      quantity: true,
      onHandAfter: true,
      reservedAfter: true,
      reason: true,
      orderId: true,
      actorId: true,
      createdAt: true,
    },
  });
}

type Transactional = { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> };

async function runInTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  const candidate = db as unknown as Partial<Transactional>;
  if (typeof candidate.$transaction !== "function") return fn(db);
  return (candidate as Transactional).$transaction((tx) => fn(tx as Db));
}
