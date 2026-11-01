import { PassThrough, Readable } from "node:stream";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import * as catalog from "@repo/catalog";
import { prisma } from "@repo/database";
import { AdminAuthError, requirePermission } from "@/lib/auth";

export const runtime = "nodejs";

/** Rows read per query: bounded memory however large the catalogue grows. */
const BATCH = 500;

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * The products sheet as a download. Same file `previewProductsSheet` reads
 * back (see lib/actions/catalog-sheet.ts): export, edit in Excel, preview,
 * apply. Both languages are columns and the headers stay English.
 *
 * A route, not a server action: an action would return the whole workbook
 * base64-encoded inside one response. Here rows are read in batches and
 * written to the response as they are produced.
 *
 * No rate limit: the only limiter in the repo (apps/web limitAction) is
 * web-only and keyed on storefront traffic; this route needs a signed-in
 * admin with catalog:read.
 */
export async function GET() {
  try {
    await requirePermission("catalog:read");
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "unauthenticated" ? 401 : 403 });
    }
    throw err;
  }

  // For the "N products exported" toast; headers go out before the stream.
  const total = await prisma.product.count();

  const output = new PassThrough();
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: output, useStyles: true });
  workbook.creator = "Art Lighting admin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = catalog.PRODUCT_COLUMNS.map((key) => ({
    header: key,
    key,
    width: key.startsWith("description") ? 48 : key.startsWith("name") ? 32 : 14,
    // Text, not "general": Excel would otherwise read 729.00 as a float and
    // write 729 back, and a SKU like 202-15 as a date.
    ...(key === "sku" || key === "price" || key === "discount" ? { style: { numFmt: "@" } } : {}),
  }));
  sheet.getRow(1).font = { bold: true };

  void (async () => {
    try {
      let after: string | undefined;
      for (;;) {
        const rows = await catalog.exportProducts({}, undefined, { take: BATCH, after });
        for (const row of rows) sheet.addRow(row).commit();
        if (rows.length < BATCH) break;
        after = rows[rows.length - 1]!.sku;
      }
      sheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("Products export failed", error);
      // Ends the response as an error instead of a truncated, valid-looking file.
      output.destroy(error instanceof Error ? error : new Error("export failed"));
    }
  })();

  const filename = `artlighting-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(total),
    },
  });
}
