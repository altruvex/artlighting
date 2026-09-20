/**
 * Repairs the maximum-wattage figure where the two stores disagree.
 *
 * The legacy `ProductSpecification` table holds one row per language, so the
 * same figure is typed twice and can drift. It did: six products carry an
 * Arabic "٠" — the Arabic-Indic zero — as their wattage. Two of them have the
 * real figure in the English row (12 W and 36 W); on the Arabic page they
 * read "٠ وات", and the page title said so too.
 *
 * The other four have no English figure either, so the spec backfill parsed
 * the "٠" and wrote a structured measurement of 0 W. A fixture with no
 * wattage recorded is not a 0 W fixture, and a spec table that states one is
 * worse than a spec table that omits it.
 *
 * So, per product:
 *   - a structured measurement that disagrees with a real English figure is
 *     corrected, and the Arabic legacy string is brought back in line;
 *   - a structured measurement of 0 that came from nothing but the "٠" is
 *     deleted, along with the item if that leaves it empty, and the Arabic
 *     legacy string is cleared.
 *
 * Nothing is invented: a figure is only written where one of the two stores
 * already holds it.
 *
 * Idempotent: a product whose stores already agree is skipped, so a second
 * run reports nothing to do.
 *
 * Run: pnpm --filter @repo/catalog fix:wattage -- --dry-run
 *      pnpm --filter @repo/catalog fix:wattage -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { normalizeDigits } = await import("../src/specs");

reportHeader("Fix: the wattage the two spec stores disagree on", options, hostOf(databaseUrl()));

const products = await prisma.product.findMany({
  select: {
    id: true,
    productId: true,
    specifications: { select: { id: true, language: true, maximumWattage: true } },
    specGroups: {
      select: {
        items: {
          where: { key: "maximumWattage" },
          select: { id: true, unit: true, measurements: { select: { id: true, value: true } } },
        },
      },
    },
  },
  orderBy: { productId: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

/**
 * The Arabic rows are written in Arabic-Indic digits — every other wattage
 * in the table is. Writing "12" there would leave a Western number sitting
 * in an Arabic cell that a card renders as-is.
 */
function arabicDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
}

/** A figure, or null when the cell holds nothing usable. Zero is not a figure. */
function figure(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = normalizeDigits(String(raw)).trim();
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

type Plan =
  | { kind: "correct"; productId: string; to: number; itemId: string; measurementId: string | null; arRowId: string | null; from: string }
  | { kind: "clear"; productId: string; itemId: string; measurementIds: string[]; arRowId: string | null };

const plans: Plan[] = [];

for (const product of products) {
  const item = product.specGroups.flatMap((group) => group.items)[0];
  const rows = Object.fromEntries(product.specifications.map((row) => [row.language, row]));
  const en = figure(rows.en?.maximumWattage);
  const ar = figure(rows.ar?.maximumWattage);
  const stored = item?.measurements[0] ? figure(String(item.measurements[0].value)) : null;

  // The truth is whichever store holds a real figure. English first: it is
  // the row the Arabic zeroes were typed against.
  const truth = en ?? stored ?? ar;

  const arText = rows.ar?.maximumWattage ?? null;
  const arIsZero = arText !== null && arText.trim() !== "" && figure(arText) === null;

  if (truth !== null) {
    // Not just the value: the Arabic cell has to be spelled in Arabic digits.
    const arAgrees = ar === truth && rows.ar?.maximumWattage === arabicDigits(truth);
    const storedAgrees = stored === truth;
    if (arAgrees && storedAgrees) continue;
    if (!item) continue; // nothing structured to correct; leave it to the spec backfill
    plans.push({
      kind: "correct",
      productId: product.productId,
      to: truth,
      itemId: item.id,
      measurementId: item.measurements[0]?.id ?? null,
      arRowId: arAgrees ? null : (rows.ar?.id ?? null),
      from: `en=${JSON.stringify(rows.en?.maximumWattage ?? null)} ar=${JSON.stringify(arText)} structured=${stored ?? "none"}`,
    });
    continue;
  }

  // No figure anywhere. Anything structured came from the "٠" and is a claim
  // the catalogue cannot support.
  const hasStructured = item && item.measurements.length > 0;
  if (!hasStructured && !arIsZero) continue;
  plans.push({
    kind: "clear",
    productId: product.productId,
    itemId: item?.id ?? "",
    measurementIds: item?.measurements.map((m) => m.id) ?? [],
    arRowId: arIsZero ? (rows.ar?.id ?? null) : null,
  });
}

console.log(`  products examined:          ${products.length}`);
console.log(`  wattage to correct:         ${plans.filter((p) => p.kind === "correct").length}`);
console.log(`  invented zeroes to remove:  ${plans.filter((p) => p.kind === "clear").length}`);
console.log("");

if (plans.length === 0) {
  console.log("  Nothing to do.");
} else {
  for (const plan of plans) {
    if (plan.kind === "correct") {
      console.log(`  ${plan.productId}: -> ${plan.to} W   (${plan.from})`);
    } else {
      console.log(`  ${plan.productId}: remove the 0 W measurement and the Arabic "٠"`);
    }
  }
  console.log("");

  if (options.dryRun) {
    console.log("  DRY RUN — nothing was written.");
  } else {
    for (const plan of plans) {
      await prisma.$transaction(async (tx) => {
        if (plan.kind === "correct") {
          if (plan.measurementId) {
            await tx.specMeasurement.update({
              where: { id: plan.measurementId },
              data: { value: plan.to },
            });
          } else {
            await tx.specMeasurement.create({
              data: { itemId: plan.itemId, value: plan.to },
            });
          }
          if (plan.arRowId) {
            await tx.productSpecification.update({
              where: { id: plan.arRowId },
              data: { maximumWattage: arabicDigits(plan.to) },
            });
          }
        } else {
          if (plan.measurementIds.length > 0) {
            await tx.specMeasurement.deleteMany({ where: { id: { in: plan.measurementIds } } });
          }
          // An item with no measurement left renders as a label with an empty
          // cell, which reads as "we measured this and got nothing".
          if (plan.itemId) {
            const left = await tx.specMeasurement.count({ where: { itemId: plan.itemId } });
            if (left === 0) await tx.specItem.delete({ where: { id: plan.itemId } });
          }
          if (plan.arRowId) {
            await tx.productSpecification.update({
              where: { id: plan.arRowId },
              data: { maximumWattage: null },
            });
          }
        }
      });
    }
    console.log(`  Wrote ${plans.length} product${plans.length === 1 ? "" : "s"}.`);
  }
}

await prisma.$disconnect();
