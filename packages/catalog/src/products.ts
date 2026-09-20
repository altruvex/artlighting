import { addMoney, applyRate, clampNonNegative, money, roundMoney, serializeMoney, subtractMoney } from "@repo/money";
import { prisma, type Db } from "./client";
import {
  type BulkPriceOperation,
  type CreateProductInput,
  type UpdateProductGeneralInput,
  type UpdateVariantInput,
  bulkPriceOperationSchema,
  createProductSchema,
  updateProductGeneralSchema,
  updateVariantSchema,
} from "./schemas";
import { defaultLocation, receiveStock, setCountedStock } from "./inventory";

/**
 * The product domain service. The admin actions, the Excel import and the
 * quotation write-back all go through these, so the rules — validation,
 * price history, the stock sync — apply the same way whichever door the
 * write comes in by.
 *
 * Authorization is the caller's job: these functions assume the caller has
 * already checked the permission. They are the *what*, not the *who*.
 */

/** Creates a product together with its default variant, in one transaction. */
export async function createProduct(input: CreateProductInput, db: Db = prisma) {
  const data = createProductSchema.parse(input);

  return runInTransaction(db, async (tx) => {
    const product = await tx.product.create({
      data: {
        productId: data.productId,
        productName: data.productName,
        brand: data.brand,
        sectionType: data.sectionType,
        spotlightType: data.spotlightType,
        categoryId: data.categoryId,
        lightingtypeId: data.lightingtypeId,
        price: data.price,
      },
    });

    // One purchasable configuration per product today.
    const variant = await tx.productVariant.create({
      data: { productId: product.id, sku: product.productId, isDefault: true },
    });

    // Opening stock goes through the ledger like any other receipt, so a
    // product created with 10 units can say where those 10 came from.
    if (data.stock > 0) {
      await receiveStock(variant.id, data.stock, "system", "Opening stock, product created", tx);
    } else {
      // Still open an inventory row, so the product appears in the stock
      // list rather than silently having no inventory at all.
      const location = await defaultLocation(tx);
      await tx.inventoryItem.create({ data: { variantId: variant.id, locationId: location.id } });
    }

    return product;
  });
}

export async function updateProductGeneral(
  productId: string,
  input: UpdateProductGeneralInput,
  db: Db = prisma,
) {
  const data = updateProductGeneralSchema.parse(input);
  return db.product.update({ where: { id: productId }, data });
}

/**
 * Changes one product's price and records the change. Goes through the
 * client extension so PriceHistory is written by the same code path for
 * every caller — a single edit, a bulk edit, or an import row.
 */
export async function setProductPrice(productId: string, newPrice: string, changedBy: string) {
  return prisma.product.updatePrice(productId, newPrice, changedBy);
}

/** The new price for one current price, with the operation applied. */
export function applyPriceOperation(currentPrice: string, operation: BulkPriceOperation): string {
  const current = money(currentPrice);

  switch (operation.mode) {
    case "set":
      return serializeMoney(money(operation.amount));
    case "increase_amount":
      return serializeMoney(addMoney(current, operation.amount));
    case "decrease_amount":
      return serializeMoney(clampNonNegative(subtractMoney(current, operation.amount)));
    case "increase_percent":
      return serializeMoney(roundMoney(addMoney(current, applyRate(current, operation.rate))));
    case "decrease_percent":
      return serializeMoney(clampNonNegative(roundMoney(subtractMoney(current, applyRate(current, operation.rate)))));
  }
}

export interface BulkPricePreviewRow {
  productId: string;
  sku: string;
  productName: string;
  oldPrice: string;
  newPrice: string;
  changed: boolean;
}

export interface BulkPricePreview {
  rows: BulkPricePreviewRow[];
  /** Requested ids with no product behind them. */
  missing: string[];
}

/** Thrown rather than silently pricing a smaller set than the caller asked for. */
export class MissingProductsError extends Error {
  constructor(readonly missing: string[]) {
    super(`No product for ${missing.length} of the requested ids: ${missing.join(", ")}`);
    this.name = "MissingProductsError";
  }
}

/**
 * What a bulk price edit *would* do. Read-only, so the admin sees the diff
 * before anything is written; `applyBulkPrice` recomputes from the same
 * function, so the preview and the write cannot drift apart.
 *
 * Ids with no product behind them come back in `missing` instead of being
 * dropped: a selection of ten that quietly priced eight would look like a
 * success.
 */
export async function previewBulkPrice(
  productIds: string[],
  operation: BulkPriceOperation,
  db: Db = prisma,
): Promise<BulkPricePreview> {
  const op = bulkPriceOperationSchema.parse(operation);
  const requested = [...new Set(productIds)];

  const products = await db.product.findMany({
    where: { id: { in: requested } },
    select: { id: true, productId: true, productName: true, price: true },
    orderBy: { productName: "asc" },
  });

  const found = new Set(products.map((product) => product.id));
  const rows = products.map((product) => {
    const oldPrice = serializeMoney(product.price);
    const newPrice = applyPriceOperation(oldPrice, op);
    return {
      productId: product.id,
      sku: product.productId,
      productName: product.productName,
      oldPrice,
      newPrice,
      // Decimal comparison: "729.00" and "729" are the same price.
      changed: !money(oldPrice).equals(newPrice),
    };
  });

  return { rows, missing: requested.filter((id) => !found.has(id)) };
}

/**
 * Applies a bulk price edit in one transaction, writing a PriceHistory row
 * for every product whose price actually moved. All or nothing: a failure
 * on the last product leaves none of them changed.
 */
export async function applyBulkPrice(
  productIds: string[],
  operation: BulkPriceOperation,
  changedBy: string,
): Promise<{ updated: number; unchanged: number }> {
  const op = bulkPriceOperationSchema.parse(operation);

  return prisma.$transaction(async (tx) => {
    const { rows, missing } = await previewBulkPrice(productIds, op, tx);
    // Throwing rolls the transaction back, so a selection that named a
    // product that no longer exists changes nothing at all.
    if (missing.length > 0) throw new MissingProductsError(missing);

    const changes = rows.filter((row) => row.changed);

    for (const change of changes) {
      await tx.product.update({
        where: { id: change.productId },
        data: { price: change.newPrice },
      });
      await tx.priceHistory.create({
        data: {
          productId: change.productId,
          oldPrice: change.oldPrice,
          newPrice: change.newPrice,
          changedBy,
        },
      });
    }

    return { updated: changes.length, unchanged: rows.length - changes.length };
  });
}

/**
 * Updates a variant. A stock figure in the input is a count — it says what
 * is there — so it goes through the inventory ledger rather than setting a
 * column, and lands with a reason like every other movement.
 */
export async function updateVariant(
  variantId: string,
  input: UpdateVariantInput,
  actorId = "system",
  db: Db = prisma,
) {
  const { stock, ...data } = updateVariantSchema.parse(input);

  return runInTransaction(db, async (tx) => {
    const variant = await tx.productVariant.update({ where: { id: variantId }, data });
    if (stock !== undefined) {
      await setCountedStock(variantId, stock, actorId, "Set from the product editor", tx);
    }
    return variant;
  });
}

/** Sets stock on a product's default variant, through the ledger. */
export async function setDefaultVariantStock(
  productId: string,
  stock: number,
  actorId = "system",
  db: Db = prisma,
) {
  return runInTransaction(db, async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: { productId, isDefault: true },
      select: { id: true },
    });
    if (!variant) throw new Error(`Product ${productId} has no default variant`);
    await setCountedStock(variant.id, stock, actorId, "Set from the product editor", tx);
  });
}

/**
 * Runs `fn` in a transaction, unless `db` already is one — nesting a
 * transaction inside a transaction is an error in Prisma, and this is what
 * lets every function here be called both on its own and as part of a
 * larger unit of work (an import batch, say).
 *
 * The probe reads the property rather than using `in`: the exported client
 * is a lazy Proxy with only a `get` trap, so `"$transaction" in prisma` is
 * false and every write here would have silently run unwrapped.
 */
type Transactional = { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> };

async function runInTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  const candidate = db as unknown as Partial<Transactional>;
  if (typeof candidate.$transaction !== "function") return fn(db);
  return (candidate as Transactional).$transaction((tx) => fn(tx as Db));
}
