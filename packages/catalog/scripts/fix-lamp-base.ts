/**
 * Brings the recorded lamp base in line with the bulb the fixture is
 * actually sold with.
 *
 * The catalogue recorded E27 for all 47 arm-bearing chandeliers — the only
 * socket the shared vocabulary had ever held. Four of them take a candle
 * bulb on an E14 socket, which is why nothing in the data could tell them
 * apart and they had to be found in the product photographs. Now that the
 * showroom assigns bulbs, the assignment knows the answer: a fixture sold
 * with an E14 bulb has an E14 socket.
 *
 * So the base is derived rather than listed. Nothing here names a product:
 * change which bulb a fixture is sold with and re-run, and the spec
 * follows. Only the structured SpecItem is written, through the shared
 * option so the two languages cannot drift. The legacy ProductSpecification
 * column is left alone: nothing reads it any more.
 *
 * A fixture with no lamp-base row is reported, not given one: writing a
 * spec that was never recorded is inventing product documentation.
 *
 * Idempotent: a fixture whose base already matches its bulb is skipped.
 *
 * Run: pnpm --filter @repo/catalog fix:lamp-base -- --dry-run
 *      pnpm --filter @repo/catalog fix:lamp-base -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");

reportHeader("Fix: the lamp base a fixture records", options, hostOf(databaseUrl()));

/** The socket each base is written as, in the shared vocabulary and the legacy column. */
const OPTION_KEY = { E27: "e27", E14: "e14" } as const;
const LABEL = { E27: "E27", E14: "E14" } as const;

const fixtures = await prisma.product.findMany({
  where: { hNumber: { gt: 0 } },
  select: {
    id: true,
    productId: true,
    bulbs: { where: { isDefault: true }, select: { bulb: { select: { base: true } } } },
    specGroups: {
      select: {
        items: {
          where: { key: "lampBase" },
          select: { id: true, optionId: true, option: { select: { key: true } } },
        },
      },
    },
  },
  orderBy: { productId: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

type Plan = {
  productId: string;
  base: "E27" | "E14";
  from: string;
  itemId: string;
};

const plans: Plan[] = [];
const withoutRow: string[] = [];

for (const fixture of fixtures) {
  const base = fixture.bulbs[0]?.bulb.base;
  if (!base) continue; // no bulb assigned; nothing to derive from

  const item = fixture.specGroups.flatMap((group) => group.items)[0];
  if (!item) {
    withoutRow.push(fixture.productId);
    continue;
  }

  if (item.option?.key === OPTION_KEY[base]) continue;

  plans.push({
    productId: fixture.productId,
    base,
    from: item.option?.key ?? "none",
    itemId: item.id,
  });
}

console.log(`  fixtures with a bulb assigned: ${fixtures.filter((f) => f.bulbs.length > 0).length}`);
console.log(`  bases to correct:              ${plans.length}`);
if (withoutRow.length > 0) {
  console.log("");
  console.log(`  No lamp-base row to correct — left alone (${withoutRow.length}):`);
  console.log(`    ${withoutRow.join(", ")}`);
}
console.log("");

if (plans.length === 0) {
  console.log("  Nothing to do.");
} else {
  for (const plan of plans) {
    console.log(`  ${plan.productId.padEnd(12)} -> ${plan.base}   (${plan.from})`);
  }
  console.log("");

  if (options.dryRun) {
    console.log("  DRY RUN — nothing was written.");
  } else {
    // The option is shared, so both languages read the same row and cannot
    // come to disagree the way the per-language strings did.
    const needed = [...new Set(plans.map((plan) => OPTION_KEY[plan.base]))];
    const optionIds = new Map<string, string>();
    for (const key of needed) {
      const label = key === "e14" ? LABEL.E14 : LABEL.E27;
      const option = await prisma.specOption.upsert({
        where: { key },
        create: {
          key,
          translations: {
            create: [
              { language: "en", label },
              { language: "ar", label },
            ],
          },
        },
        update: {},
        select: { id: true },
      });
      optionIds.set(key, option.id);
    }

    for (const plan of plans) {
      await prisma.specItem.update({
        where: { id: plan.itemId },
        data: { optionId: optionIds.get(OPTION_KEY[plan.base])! },
      });
    }
    console.log(`  Corrected ${plans.length} fixture${plans.length === 1 ? "" : "s"}.`);
  }
}

await prisma.$disconnect();
