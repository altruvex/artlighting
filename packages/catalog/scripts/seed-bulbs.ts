/**
 * Creates the bulbs the showroom fits, and offers them on every chandelier
 * that has arms.
 *
 * Only the two Ali priced are seeded: 9 W at 25 EGP and 15 W at 40 EGP.
 * The candle bulb — the "بلحة" — is deliberately not here. Nothing in the
 * catalogue can tell which fixtures take one: all 47 arm-bearing
 * chandeliers record `lampBase = E27`, and the shared vocabulary has no
 * E14 in it at all. Guessing it from a product photo would price a real
 * order wrong, so that one is added from the admin, where the price comes
 * from someone who knows it.
 *
 * Arms are the rule, not the lighting type: a fixture with `hNumber` is a
 * fixture a bulb goes into. That also covers mc7021, an LED chandelier
 * carrying 8 arms — almost certainly wrong data, and reported rather than
 * silently included.
 *
 * Idempotent: bulbs are upserted by key, and a product that already offers
 * a bulb keeps the default it has.
 *
 * Run: pnpm --filter @repo/catalog seed:bulbs -- --dry-run
 *      pnpm --filter @repo/catalog seed:bulbs -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");

reportHeader("Seed: the bulbs a chandelier is sold with", options, hostOf(databaseUrl()));

const BULBS = [
  {
    key: "e27_9w",
    wattage: 9,
    base: "E27" as const,
    price: "25.00",
    position: 0,
    names: { en: "Standard", ar: "عادية" },
  },
  {
    key: "e27_15w",
    wattage: 15,
    base: "E27" as const,
    price: "40.00",
    position: 1,
    names: { en: "Standard", ar: "عادية" },
  },
];

/** The fixture is sold with the cheaper of the two unless told otherwise. */
const DEFAULT_KEY = "e27_9w";

const withArms = await prisma.product.findMany({
  where: { hNumber: { gt: 0 } },
  select: {
    id: true,
    productId: true,
    hNumber: true,
    sectionType: true,
    chandelierLightingType: true,
    bulbs: { select: { bulbId: true, isDefault: true } },
  },
  orderBy: { productId: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

const untouched = withArms.filter((p) => p.bulbs.length === 0);
const odd = withArms.filter((p) => p.chandelierLightingType !== "lamp");

console.log(`  bulbs to create or update:        ${BULBS.length}`);
console.log(`  fixtures with arms:               ${withArms.length}`);
console.log(`  of those, not yet offering bulbs: ${untouched.length}`);
if (odd.length > 0) {
  console.log("");
  console.log("  Fixtures with arms that are not marked as lamp type — check these:");
  for (const p of odd) {
    console.log(`    ${p.productId}  arms=${p.hNumber}  type=${p.chandelierLightingType ?? "null"}`);
  }
}
console.log("");

if (options.dryRun) {
  for (const bulb of BULBS) {
    console.log(`  ${bulb.key.padEnd(10)} ${String(bulb.wattage).padStart(2)} W  ${bulb.base}  ${bulb.price} EGP each`);
  }
  console.log("");
  for (const p of untouched.slice(0, 8)) {
    const total = (Number(BULBS[0]!.price) * (p.hNumber ?? 0)).toFixed(2);
    console.log(`  ${p.productId.padEnd(13)} arms=${String(p.hNumber).padStart(2)} -> default ${DEFAULT_KEY} (+${total} EGP)`);
  }
  if (untouched.length > 8) console.log(`  … and ${untouched.length - 8} more`);
  console.log("");
  console.log("  DRY RUN — nothing was written.");
} else {
  const ids = new Map<string, string>();
  for (const bulb of BULBS) {
    const row = await prisma.bulb.upsert({
      where: { key: bulb.key },
      create: {
        key: bulb.key,
        wattage: bulb.wattage,
        base: bulb.base,
        price: bulb.price,
        position: bulb.position,
        translations: {
          create: [
            { language: "en", name: bulb.names.en },
            { language: "ar", name: bulb.names.ar },
          ],
        },
      },
      // A re-run must not overwrite a price someone has since corrected in
      // the admin; only the shape of the row is kept in step.
      update: { wattage: bulb.wattage, base: bulb.base, position: bulb.position },
      select: { id: true },
    });
    ids.set(bulb.key, row.id);
  }

  const defaultId = ids.get(DEFAULT_KEY)!;
  for (const product of untouched) {
    await prisma.$transaction(async (tx) => {
      for (const [position, bulb] of BULBS.entries()) {
        await tx.productBulb.create({
          data: {
            productId: product.id,
            bulbId: ids.get(bulb.key)!,
            position,
            isDefault: ids.get(bulb.key) === defaultId,
          },
        });
      }
    });
  }
  console.log(`  Created ${BULBS.length} bulbs and fitted ${untouched.length} fixtures.`);
}

await prisma.$disconnect();
