import { prisma } from "@repo/database";
import type { DatasheetProductData } from "@repo/datasheet";
import { getDatasheetProductData } from "./draft";

/** What the bulk job needs to group and name products before building them. */
export interface DatasheetProductRow {
  id: string;
  productId: string;
  category: { name: string };
}

/** One findMany for the whole job; each product's sheet is then built on its own. */
export async function getDatasheetProductRows(
  productIds: string[]
): Promise<{ found: DatasheetProductRow[]; missingIds: string[] }> {
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, productId: true, category: { select: { name: true } } },
  });
  const foundIds = new Set(found.map((p) => p.id));
  return { found, missingIds: productIds.filter((id) => !foundIds.has(id)) };
}

/** The unedited sheet for one row — the same path the single download takes. */
export async function mapProductToDatasheetData(product: DatasheetProductRow): Promise<DatasheetProductData> {
  const data = await getDatasheetProductData(product.id);
  if (!data) throw new Error("product not found");
  return data;
}
