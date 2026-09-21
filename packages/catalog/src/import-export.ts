import { money, serializeMoney, serializeRate } from "@repo/money";
import { prisma, type Db } from "./client";
import { type ImportRow, importRowSchema } from "./schemas";
import { availableFrom, inventorySelect, setCountedStock } from "./inventory";
import { productDiscountRates } from "./discounts";

/**
 * Excel round-trip for the catalogue.
 *
 * This is a data file, not a customer document, so it carries **both**
 * languages as columns (D11 makes generated *documents* English-only; a
 * spreadsheet the admin edits and feeds back is not one of those). Headers
 * are English and the sheet is left-to-right, because a mirrored sheet with
 * Arabic headers is unusable in Excel's own formula bar.
 *
 * Import never deletes: a row missing from the sheet is a row left alone.
 */

/** The column order of the products sheet, and the only headers an import accepts. */
export const PRODUCT_COLUMNS = [
  "sku",
  "name_en",
  "name_ar",
  "description_en",
  "description_ar",
  "brand",
  "price",
  "discount",
  "stock",
  "isActive",
  "featured",
  "trackInventory",
] as const;

export type ProductColumn = (typeof PRODUCT_COLUMNS)[number];

export interface ExportedProduct extends Record<ProductColumn, string | number | boolean | null> {
  sku: string;
}

/** Every product as a row, in the export's column order. */
export async function exportProducts(
  where: Record<string, unknown> = {},
  db: Db = prisma,
): Promise<ExportedProduct[]> {
  const products = await db.product.findMany({
    where,
    select: {
      id: true,
      productId: true,
      productName: true,
      brand: true,
      price: true,
      // The engine reads these to decide what applies.
      categoryId: true,
      lightingtypeId: true,
      sectionType: true,
      isActive: true,
      featured: true,
      trackInventory: true,
      translations: { select: { language: true, name: true, description: true } },
      variants: { where: { isDefault: true }, select: { id: true, inventory: inventorySelect() }, take: 1 },
    },
    orderBy: { productId: "asc" },
  });

  const rates = await productDiscountRates(products, db);

  return products.map((product) => {
    const byLanguage = new Map(product.translations.map((t) => [t.language, t]));
    return {
      sku: product.productId,
      name_en: byLanguage.get("en")?.name ?? product.productName,
      name_ar: byLanguage.get("ar")?.name ?? null,
      description_en: byLanguage.get("en")?.description ?? null,
      description_ar: byLanguage.get("ar")?.description ?? null,
      brand: product.brand,
      // Money as a string, so Excel shows what the database holds rather
      // than a float's nearest representation.
      price: serializeMoney(product.price),
      discount: rates[product.id] ?? serializeRate(0),
      // Sellable units from the inventory ledger — the figure an import
      // then writes back through a counted adjustment.
      stock: availableFrom(product.variants[0]?.inventory),
      isActive: product.isActive,
      featured: product.featured,
      trackInventory: product.trackInventory,
    };
  });
}

export type ImportAction = "create" | "update" | "unchanged" | "error";

export interface ImportPlanRow {
  /** 1-based row number in the sheet, so an error points at what the admin sees. */
  rowNumber: number;
  sku: string | null;
  action: ImportAction;
  /** Field → [before, after]; only fields the sheet actually changes. */
  changes: Record<string, [string, string]>;
  errors: string[];
}

export interface ImportPlan {
  rows: ImportPlanRow[];
  counts: Record<ImportAction, number>;
  /** SKUs appearing more than once in the sheet. */
  duplicateSkus: string[];
}

/**
 * What an import *would* do. Nothing is written, and every row is reported
 * — including the ones that are fine — so the preview screen shows the
 * whole sheet rather than only its problems.
 */
export async function planImport(rawRows: unknown[], db: Db = prisma): Promise<ImportPlan> {
  const rows: ImportPlanRow[] = [];
  const seen = new Map<string, number>();
  const duplicateSkus = new Set<string>();

  const parsed: { rowNumber: number; row: ImportRow | null; rawSku: string | null; errors: string[] }[] =
    rawRows.map((raw, index) => {
      const result = importRowSchema.safeParse(raw);
      // Kept even when the row fails, so an error over a bad price still
      // names the SKU the admin has to go and look at.
      const rawSku =
        typeof raw === "object" && raw !== null && typeof (raw as { sku?: unknown }).sku === "string"
          ? ((raw as { sku: string }).sku)
          : null;

      if (result.success) return { rowNumber: index + 2, row: result.data, rawSku, errors: [] };
      return {
        rowNumber: index + 2,
        row: null,
        rawSku,
        // "price: money_more_than_2_decimals" — the column, then the rule it
        // broke, so the admin can find the cell.
        errors: result.error.issues.map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`),
      };
    });

  for (const entry of parsed) {
    if (!entry.row) continue;
    const previous = seen.get(entry.row.sku);
    if (previous !== undefined) duplicateSkus.add(entry.row.sku);
    else seen.set(entry.row.sku, entry.rowNumber);
  }

  const skus = [...seen.keys()];
  const existing = await db.product.findMany({
    where: { productId: { in: skus } },
    select: {
      id: true,
      productId: true,
      productName: true,
      brand: true,
      price: true,
      isActive: true,
      featured: true,
      trackInventory: true,
      categoryId: true,
      lightingtypeId: true,
      sectionType: true,
      translations: { select: { language: true, name: true, description: true } },
      variants: { where: { isDefault: true }, select: { id: true, inventory: inventorySelect() }, take: 1 },
    },
  });
  const bySku = new Map(existing.map((product) => [product.productId, product]));
  // The effective rates, so a sheet round-tripped unchanged does not look
  // like it is trying to change the discount.
  const rates = await productDiscountRates(existing, db);

  for (const entry of parsed) {
    if (!entry.row) {
      rows.push({ rowNumber: entry.rowNumber, sku: entry.rawSku, action: "error", changes: {}, errors: entry.errors });
      continue;
    }

    const row = entry.row;
    const current = bySku.get(row.sku);

    if (duplicateSkus.has(row.sku)) {
      rows.push({
        rowNumber: entry.rowNumber,
        sku: row.sku,
        action: "error",
        changes: {},
        errors: [`sku: appears more than once in the sheet (first at row ${seen.get(row.sku)})`],
      });
      continue;
    }

    if (!current) {
      // Creating needs the fields a product cannot exist without, and the
      // sheet has no column for category or lighting type — so an unknown
      // SKU is reported rather than half-created.
      rows.push({
        rowNumber: entry.rowNumber,
        sku: row.sku,
        action: "error",
        changes: {},
        errors: ["sku: no product with this SKU. Create it in the admin first; import only updates."],
      });
      continue;
    }

    const byLanguage = new Map(current.translations.map((t) => [t.language, t]));
    const changes: Record<string, [string, string]> = {};
    const note = (field: string, before: unknown, after: unknown) => {
      const from = before == null ? "" : String(before);
      const to = after == null ? "" : String(after);
      if (from !== to) changes[field] = [from, to];
    };

    if (row.name_en !== undefined) note("name_en", byLanguage.get("en")?.name ?? current.productName, row.name_en);
    if (row.name_ar !== undefined) note("name_ar", byLanguage.get("ar")?.name, row.name_ar);
    if (row.description_en !== undefined) note("description_en", byLanguage.get("en")?.description, row.description_en);
    if (row.description_ar !== undefined) note("description_ar", byLanguage.get("ar")?.description, row.description_ar);
    if (row.brand !== undefined) note("brand", current.brand, row.brand);
    // Decimal comparison: "729" in the sheet and 729.00 in the database are
    // the same price, and must not show up as a change.
    if (row.price !== undefined && !money(current.price).equals(row.price)) {
      changes.price = [serializeMoney(current.price), row.price];
    }
    // A discount is a Discount row now, not a column on the product: it
    // carries a name, a window, a scope and limits that a spreadsheet cell
    // cannot express. The export still shows the effective rate because it
    // is useful to see, but a sheet that tries to change it is told where
    // that decision actually lives rather than having the edit silently
    // dropped.
    if (row.discount !== undefined && !money(rates[current.id] ?? 0).equals(row.discount)) {
      rows.push({
        rowNumber: entry.rowNumber,
        sku: row.sku,
        action: "error",
        changes: {},
        errors: ["discount: discounts are managed on the discounts page, not in this sheet"],
      });
      continue;
    }
    if (row.stock !== undefined) note("stock", availableFrom(current.variants[0]?.inventory), row.stock);
    if (row.isActive !== undefined) note("isActive", current.isActive, row.isActive);
    if (row.featured !== undefined) note("featured", current.featured, row.featured);
    if (row.trackInventory !== undefined) note("trackInventory", current.trackInventory, row.trackInventory);

    rows.push({
      rowNumber: entry.rowNumber,
      sku: row.sku,
      action: Object.keys(changes).length > 0 ? "update" : "unchanged",
      changes,
      errors: [],
    });
  }

  const counts: Record<ImportAction, number> = { create: 0, update: 0, unchanged: 0, error: 0 };
  for (const row of rows) counts[row.action] += 1;

  return { rows, counts, duplicateSkus: [...duplicateSkus] };
}

export interface ImportResult {
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Applies an import in batches, one transaction per batch.
 *
 * The plan is recomputed here from the same rows rather than trusted from
 * the browser: the preview may be minutes old, and the price it showed may
 * not be the price in the database any more. Rows that error, or that the
 * plan says change nothing, are skipped.
 */
export async function applyImport(
  rawRows: unknown[],
  changedBy: string,
  batchSize = 25,
): Promise<ImportResult> {
  const plan = await planImport(rawRows);
  const actionable = plan.rows.filter((row) => row.action === "update");

  const parsedBySku = new Map<string, ImportRow>();
  for (const raw of rawRows) {
    const result = importRowSchema.safeParse(raw);
    if (result.success) parsedBySku.set(result.data.sku, result.data);
  }

  let updated = 0;
  for (let offset = 0; offset < actionable.length; offset += batchSize) {
    const batch = actionable.slice(offset, offset + batchSize);

    await prisma.$transaction(async (tx) => {
      for (const planRow of batch) {
        const row = parsedBySku.get(planRow.sku!);
        if (!row) continue;

        const product = await tx.product.findUnique({
          where: { productId: row.sku },
          select: { id: true, price: true },
        });
        if (!product) continue;

        const data: Record<string, unknown> = {};
        if (row.brand !== undefined) data.brand = row.brand;
        if (row.isActive !== undefined) data.isActive = row.isActive;
        if (row.featured !== undefined) data.featured = row.featured;
        if (row.trackInventory !== undefined) data.trackInventory = row.trackInventory;
        if (row.name_en !== undefined) data.productName = row.name_en;

        if (Object.keys(data).length > 0) {
          await tx.product.update({ where: { id: product.id }, data });
        }

        // Price goes through the audited path so an import writes
        // PriceHistory exactly like a single edit does.
        if (row.price !== undefined && !money(product.price).equals(row.price)) {
          await tx.product.update({ where: { id: product.id }, data: { price: row.price } });
          await tx.priceHistory.create({
            data: {
              productId: product.id,
              oldPrice: serializeMoney(product.price),
              newPrice: row.price,
              changedBy,
            },
          });
        }

        for (const language of ["en", "ar"] as const) {
          const name = language === "en" ? row.name_en : row.name_ar;
          const description = language === "en" ? row.description_en : row.description_ar;
          if (name === undefined && description === undefined) continue;

          // Keyed on Product.id, not the SKU: the sheet matches rows by SKU,
          // but the translation belongs to the product's identity.
          const key = { productId_language: { productId: product.id, language } };
          const current = await tx.productTranslation.findUnique({
            where: key,
            select: { name: true, description: true },
          });
          await tx.productTranslation.upsert({
            where: key,
            update: {
              ...(name !== undefined ? { name } : {}),
              ...(description !== undefined ? { description } : {}),
            },
            create: {
              productId: product.id,
              language,
              name: name ?? current?.name ?? row.sku,
              description: description ?? null,
            },
          });
        }

        if (row.stock !== undefined) {
          const variant = await tx.productVariant.findFirst({
            where: { productId: product.id, isDefault: true },
            select: { id: true },
          });
          if (variant) {
            // A stock column in a sheet is a count, not a receipt: it says
            // what is there, so it goes through the same audited path as a
            // shelf count and lands in the ledger with a reason.
            await setCountedStock(variant.id, row.stock, changedBy, "Excel import", tx);
          }
        }

        updated += 1;
      }
    });
  }

  return {
    updated,
    skipped: plan.counts.unchanged,
    errors: plan.counts.error,
  };
}
