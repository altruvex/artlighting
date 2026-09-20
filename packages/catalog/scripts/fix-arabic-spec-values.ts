/**
 * Three Arabic spec values that are demonstrably wrong, corrected at the
 * source (`ProductSpecification`) so re-running the spec backfill cannot
 * reintroduce them.
 *
 * All three were invisible while every value was a free-text string typed
 * once per language; they surfaced the moment the values became a shared
 * vocabulary, because the same fact then had to have one label.
 *
 * Idempotent: it only rewrites a row that still holds the exact wrong
 * string, so a second run reports nothing to do.
 *
 * Run: pnpm --filter @repo/catalog fix:arabic-specs -- --dry-run
 *      pnpm --filter @repo/catalog fix:arabic-specs -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");

interface Correction {
  column: "electrical" | "energySaving";
  from: string;
  to: string;
  why: string;
}

const CORRECTIONS: Correction[] = [
  {
    column: "electrical",
    from: "درايفر خارجي من Phillدرجة الحمايةs",
    to: "درايفر خارجي من Phillips",
    why: 'Corrupted by a find-and-replace of "ip" → "درجة الحماية", which ate the middle of "Phillips".',
  },
  {
    column: "electrical",
    from: "درايفر خارجي من بالكوم",
    to: "درايفر داخلي من بالكوم",
    why: 'Only where English says "balcom internal Driver": the Arabic said خارجي (external), the same string as the genuinely external option, so 29 products told Arabic customers the opposite of the English.',
  },
  {
    column: "energySaving",
    from: "٩٠٪ توفير في الطاقة",
    to: "٩٠٪",
    why: 'The value repeated its own label, so the row read "توفير الطاقة: ٩٠٪ توفير في الطاقة".',
  },
];

reportHeader("Fix: three wrong Arabic spec values", options, hostOf(databaseUrl()));

let changed = 0;

for (const correction of CORRECTIONS) {
  // The internal-driver case is only wrong where the English says internal;
  // the identical Arabic string is correct on the external ones.
  const englishGuard =
    correction.to === "درايفر داخلي من بالكوم"
      ? { productId: { in: (
          await prisma.productSpecification.findMany({
            where: { language: "en", electrical: { contains: "internal", mode: "insensitive" } },
            select: { productId: true },
          })
        ).map((row) => row.productId) } }
      : {};

  const rows = await prisma.productSpecification.findMany({
    where: { language: "ar", [correction.column]: correction.from, ...englishGuard },
    select: { id: true, productId: true },
  });

  console.log(`  ${correction.column}: ${rows.length} row(s)`);
  console.log(`    ${JSON.stringify(correction.from)}`);
  console.log(`    → ${JSON.stringify(correction.to)}`);
  console.log(`    ${correction.why}`);
  console.log("");

  if (!options.dryRun && rows.length > 0) {
    await prisma.productSpecification.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { [correction.column]: correction.to },
    });
    changed += rows.length;
  }
}

if (!options.dryRun) console.log(`Applied. ${changed} row(s) corrected. Re-run backfill:specs to rebuild the options.`);

await prisma.$disconnect();
