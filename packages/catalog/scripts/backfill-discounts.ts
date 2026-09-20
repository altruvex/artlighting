/**
 * Turns `Product.discount` into real Discount rows.
 *
 * The column held a rate per product, so 117 products carrying 13% or 30%
 * were 117 independent numbers with no name, no date window and no way to
 * end a promotion other than editing every product. They become one
 * AUTOMATIC, PRODUCTS-scoped discount per distinct rate, with every product
 * at that rate attached.
 *
 * Idempotent: a discount is keyed on a deterministic id derived from the
 * rate, and its product list is replaced rather than appended, so a re-run
 * converges instead of accumulating.
 *
 * Run: pnpm --filter @repo/catalog backfill:discounts -- --dry-run
 *      pnpm --filter @repo/catalog backfill:discounts -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { serializeRate } = await import("@repo/money");

reportHeader("Backfill: Product.discount → Discount rows", options, hostOf(databaseUrl()));

const products = await prisma.product.findMany({
  where: { discount: { gt: 0 } },
  select: { id: true, productId: true, discount: true },
  orderBy: { productId: "asc" },
});

// One promotion per distinct rate.
const byRate = new Map<string, string[]>();
for (const product of products) {
  const rate = serializeRate(product.discount);
  byRate.set(rate, [...(byRate.get(rate) ?? []), product.id]);
}

console.log(`  products carrying a discount: ${products.length}`);
console.log(`  distinct rates:               ${byRate.size}\n`);

for (const [rate, productIds] of [...byRate].sort()) {
  const percent = (Number(rate) * 100).toFixed(Number(rate) * 100 % 1 === 0 ? 0 : 2);
  const name = `${percent}% off (migrated)`;
  // Deterministic, so a re-run updates the same row rather than adding one.
  const id = `migrated_rate_${rate.replace(".", "_")}`;

  console.log(`  ${name.padEnd(28)} rate ${rate}   ${productIds.length} product(s)   id=${id}`);
  if (options.dryRun) continue;

  await prisma.$transaction(async (tx) => {
    await tx.discount.upsert({
      where: { id },
      update: { name, rate, isActive: true },
      create: {
        id,
        name,
        type: "PERCENTAGE",
        mode: "AUTOMATIC",
        scope: "PRODUCTS",
        rate,
        // Carried across exactly as it behaved: always on, no limits, and
        // not stacking with anything, which is what a per-product rate was.
        stackable: false,
        isActive: true,
      },
    });
    // Replaced, not appended, so the list always matches the column.
    await tx.discountProduct.deleteMany({ where: { discountId: id } });
    await tx.discountProduct.createMany({
      data: productIds.map((productId) => ({ discountId: id, productId })),
    });
  });
}

if (!options.dryRun) {
  const rows = await prisma.discount.count();
  const links = await prisma.discountProduct.count();
  console.log(`\n  discounts now: ${rows}   product links: ${links}`);
}
console.log("\n  Product.discount is left in place until every reader moves off it.");
await prisma.$disconnect();
