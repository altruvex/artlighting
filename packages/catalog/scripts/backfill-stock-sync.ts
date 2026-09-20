/**
 * Brings the legacy `Product.quantity` mirror back in step with each
 * product's default `ProductVariant`, which is the source of truth for
 * stock.
 *
 * Idempotent: it writes only rows that disagree, so a second run reports
 * nothing to do. Re-runnable at any time — the storefront still reads
 * `Product.quantity`, so this is the repair for any drift that predates
 * the shared catalog service.
 *
 * Run: pnpm --filter @repo/catalog backfill:stock -- --dry-run
 *      pnpm --filter @repo/catalog backfill:stock -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { findStockDrift, setDefaultVariantStock } = await import("../src/index");

reportHeader("Backfill: Product.quantity ← default variant stock", options, hostOf(databaseUrl()));

const drift = await findStockDrift(prisma);
const rows = options.limit ? drift.slice(0, options.limit) : drift;

if (rows.length === 0) {
  console.log("Nothing to do: every product's quantity already matches its default variant.");
} else {
  console.log(`${drift.length} product(s) disagree${options.limit ? `, handling ${rows.length}` : ""}:\n`);
  for (const row of rows) {
    console.log(`  ${row.sku.padEnd(24)} quantity ${String(row.productQuantity).padStart(5)} → ${String(row.variantStock).padStart(5)}`);
  }
  console.log("");

  if (!options.dryRun) {
    for (const row of rows) {
      await setDefaultVariantStock(row.productId, row.variantStock);
    }
    const remaining = await findStockDrift(prisma);
    console.log(`Applied. ${rows.length} product(s) synced; ${remaining.length} still disagree.`);
  }
}

await prisma.$disconnect();
