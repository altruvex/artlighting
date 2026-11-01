"use server";

import ExcelJS from "exceljs";
import * as catalog from "@repo/catalog";
import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront";
import { ActionError, run } from "./result";

/**
 * The Excel round-trip. Export (app/api/products/export/route.ts) is the same
 * file an import reads back, so the loop is: export, edit in Excel, preview,
 * apply.
 *
 * Both languages are columns here. D11 makes generated *documents* English
 * only; this is a data file the admin edits, not something a customer
 * receives, so dropping the Arabic would make it useless for translation
 * work. Headers stay English and the sheet stays left-to-right, because a
 * mirrored sheet with Arabic headers is unusable in Excel's formula bar.
 */

const MAX_SHEET_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;

/** Reads the uploaded sheet into plain rows, by header name. */
async function readSheet(file: File): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.getWorksheet("Products") ?? workbook.worksheets[0];
  if (!sheet) throw new ActionError("The workbook has no sheets.");

  const headerRow = sheet.getRow(1);
  const headers: (string | null)[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber] = String(cell.value ?? "").trim() || null;
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    let hasValue = false;

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const header = headers[columnNumber];
      if (!header) return;
      let value = cell.value;
      // A formula cell carries its result alongside the formula.
      if (value && typeof value === "object" && "result" in value) value = (value as { result: unknown }).result as never;
      if (value && typeof value === "object" && "text" in value) value = (value as { text: string }).text as never;
      if (value === null || value === undefined || value === "") return;
      record[header] = value;
      hasValue = true;
    });

    // A blank row in the middle of a sheet is Excel noise, not an instruction.
    if (hasValue) rows.push(record);
  });

  return rows;
}

/**
 * The dry run. Reads the sheet, validates every row and reports what would
 * change — nothing is written. Called before `applyProductsSheet`, and the
 * apply recomputes the same plan, so an out-of-date preview cannot cause a
 * write the admin did not see.
 */
export async function previewProductsSheet(formData: FormData) {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("ProductActions");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ActionError(t("errors.noFile"));
    if (file.size > MAX_SHEET_BYTES) throw new ActionError(t("errors.tooLarge"));

    const rows = await readSheet(file);
    if (rows.length > MAX_ROWS) throw new ActionError(t("errors.tooManyRows", { max: MAX_ROWS }));

    return catalog.planImport(rows);
  });
}

/** Applies the sheet in batches. Never deletes: a missing row is a row left alone. */
export async function applyProductsSheet(formData: FormData) {
  return run(async () => {
    const admin = await requirePermission("price:write");
    const t = await getTranslations("ProductActions");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ActionError(t("errors.noFile"));
    if (file.size > MAX_SHEET_BYTES) throw new ActionError(t("errors.tooLarge"));

    const rows = await readSheet(file);
    if (rows.length > MAX_ROWS) throw new ActionError(t("errors.tooManyRows", { max: MAX_ROWS }));

    const result = await catalog.applyImport(rows, admin.id);
    revalidateStorefront();
    revalidatePath("/dashboard/products");
    return result;
  });
}
