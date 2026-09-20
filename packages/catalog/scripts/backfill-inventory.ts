/**
 * Opens the inventory ledger: one InventoryItem per variant at the default
 * location, holding the stock the variant currently records, and one
 * RECEIPT movement that explains where that number came from.
 *
 * The opening movement matters. Without it the ledger starts with a balance
 * nothing accounts for, and the first person to ask "why is this 10?" gets
 * no answer. With it, the first row says "opening balance, migrated".
 *
 * Idempotent: a variant that already has an inventory item is skipped, so a
 * re-run does not double the stock or add a second opening row.
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
  select: { id: true, sku: true, stock: true, product: { select: { lowStockThreshold: true } } },
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
    console.log(`  ${variant.sku.padEnd(24)} opening onHand ${String(variant.stock).padStart(5)}`);
  }
  if (variants.length > 10) console.log(`  … and ${variants.length - 10} more`);
} else {
  const location = await defaultLocation(prisma);
  console.log(`  location: ${location.code}\n`);

  let opened = 0;
  for (const variant of variants) {
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          variantId: variant.id,
          locationId: location.id,
          onHand: variant.stock,
          // The product's threshold becomes the item's starting reorder
          // point, so the restock list works from day one.
          reorderPoint: variant.product.lowStockThreshold,
        },
      });
      // A movement of zero is not an event, and the CHECK constraint agrees:
      // a variant that genuinely has no stock opens with an item and no row.
      if (variant.stock !== 0) {
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            kind: "RECEIPT",
            quantity: variant.stock,
            onHandAfter: variant.stock,
            reservedAfter: 0,
            reason: "Opening balance, migrated from ProductVariant.stock",
            actorId: "system",
          },
        });
      }
    });
    opened += 1;
    if (opened % 25 === 0) console.log(`  … ${opened}/${variants.length}`);
  }
  console.log(`\n  Opened ${opened} inventory item(s).`);
}

console.log("\n  ProductVariant.stock and Product.quantity are left as mirrors.");
await prisma.$disconnect();
