/**
 * Opens an inventory row for any variant that has none, at the default
 * location and at zero.
 *
 * The original run of this script carried each variant's old
 * `ProductVariant.stock` across as an opening RECEIPT, so the ledger would
 * not start with a balance nothing accounts for. That column is gone now,
 * so a variant reaching this script is a new one: it opens empty and is
 * stocked by a receipt or a count, both of which write their own movement.
 *
 * Idempotent: a variant that already has an inventory item is skipped.
 *
 * Run: pnpm --filter @repo/catalog backfill:inventory -- --dry-run
 *      pnpm --filter @repo/catalog backfill:inventory -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { defaultLocation } = await import("../src/inventory");

reportHeader("Backfill: open the inventory ledger", options, hostOf(databaseUrl()));

const variants = await prisma.productVariant.findMany({
  where: { inventory: { none: {} } },
  // ProductVariant.stock is gone; a variant that somehow has no inventory
  // row now opens at zero and is stocked through a receipt or a count.
  select: { id: true, sku: true, product: { select: { lowStockThreshold: true } } },
  orderBy: { sku: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

const already = await prisma.inventoryItem.count();
console.log(`  variants without an inventory item: ${variants.length}`);
console.log(`  inventory items that already exist: ${already}`);
console.log("");

if (variants.length === 0) {
  console.log("  Nothing to do.");
} else if (options.dryRun) {
  for (const variant of variants.slice(0, 10)) {
    console.log(`  ${variant.sku.padEnd(24)} opens at 0`);
  }
  if (variants.length > 10) console.log(`  … and ${variants.length - 10} more`);
} else {
  const location = await defaultLocation(prisma);
  console.log(`  location: ${location.code}\n`);

  let opened = 0;
  for (const variant of variants) {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.create({
        data: {
          variantId: variant.id,
          locationId: location.id,
          // The product's threshold becomes the item's starting reorder
          // point, so the restock list works from day one.
          reorderPoint: variant.product.lowStockThreshold,
        },
      });
    });
    opened += 1;
    if (opened % 25 === 0) console.log(`  … ${opened}/${variants.length}`);
  }
  console.log(`\n  Opened ${opened} inventory item(s).`);
}

console.log("\n  Stock itself is moved by a receipt or a count, never by a column.");
await prisma.$disconnect();
