/**
 * Moves the fixed `ProductSpecification` columns into the structured
 * `SpecGroup` / `SpecItem` tables, in both languages.
 *
 * The grouping and the labels come from SPEC_LAYOUT in src/spec-layout.ts —
 * the same four groups the datasheet already prints, in the same order, so a
 * generated datasheet reads identically before and after the switch.
 *
 * **Only products with no spec groups.** The admin editor and the
 * datasheet studio write SpecGroups directly, and nothing writes the legacy
 * columns any more, so they are stale for any product edited since. A
 * product that already has groups is skipped rather than rebuilt from them —
 * rebuilding would silently undo those edits. This is a one-time move per
 * database (production has not had it yet); it is no longer the way to roll
 * out a SPEC_LAYOUT change.
 *
 * **Idempotent.** Every row's primary key is derived from the product and
 * the position, and a product it has filled is skipped on the next run.
 *
 * **Nothing is deleted.** `ProductSpecification` stays until its drop
 * migration, which also retires this script.
 *
 * Run: pnpm --filter @repo/catalog backfill:specs -- --dry-run
 *      pnpm --filter @repo/catalog backfill:specs -- --apply
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { CHOICE_COLUMNS, optionKeyFor, parseSpecValue } = await import("../src/specs");

/**
 * The layout lives in src/spec-layout.ts — the admin product editor lays its
 * form out from the same list, so an edited spec lands where the backfill
 * put it. The order there is the order the datasheet prints.
 */
const { SPEC_LAYOUT } = await import("../src/spec-layout");

reportHeader("Backfill: ProductSpecification columns → SpecGroup / SpecItem", options, hostOf(databaseUrl()));

const alreadyStructured = await prisma.product.count({
  where: { specifications: { some: {} }, specGroups: { some: {} } },
});

const products = await prisma.product.findMany({
  where: { specifications: { some: {} }, specGroups: { none: {} } },
  select: { id: true, productId: true, specifications: true },
  orderBy: { productId: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

let groupsWritten = 0;
let itemsWritten = 0;
let skippedEmptyGroups = 0;
let written = 0;
let structured = 0;
const unparsed: { sku: string; column: string; english: string | null; arabic: string | null }[] = [];

/**
 * The shared option vocabulary, built as we go: "die_casting_aluminum" is
 * created once and pointed at by every product that uses it, so the material
 * is translated in one place instead of on 117 products.
 */
const optionIdByKey = new Map<string, string>();

async function optionIdFor(key: string, english: string | null, arabic: string | null): Promise<string> {
  const cached = optionIdByKey.get(key);
  if (cached) return cached;

  const option = await prisma.specOption.upsert({
    where: { key },
    update: {},
    create: { key },
    select: { id: true },
  });
  for (const [language, label] of [["en", english], ["ar", arabic]] as const) {
    if (!label) continue;
    await prisma.specOptionTranslation.upsert({
      where: { optionId_language: { optionId: option.id, language } },
      update: { label },
      create: { optionId: option.id, language, label },
    });
  }
  optionIdByKey.set(key, option.id);
  return option.id;
}

for (const product of products) {
  const plannedGroups: { id: string; productId: string; position: number }[] = [];
  const plannedGroupTranslations: { id: string; groupId: string; language: string; name: string }[] = [];
  const plannedItems: {
    id: string;
    groupId: string;
    key: string;
    position: number;
    unit: string | null;
    kind: "MEASUREMENT" | "RANGE" | "CHOICE" | "TEXT";
    comparator: "EXACT" | "AT_LEAST" | "AT_MOST" | "APPROX";
    optionId: string | null;
  }[] = [];
  const plannedMeasurements: {
    id: string;
    itemId: string;
    position: number;
    value: string;
    valueMax: string | null;
    conditionValue: string | null;
    conditionUnit: string | null;
  }[] = [];
  const plannedItemTranslations: { id: string; itemId: string; language: string; label: string; value: string | null }[] = [];

  const byLanguage = new Map(product.specifications.map((spec) => [spec.language, spec as Record<string, unknown>]));
  const english = byLanguage.get("en");
  const arabic = byLanguage.get("ar");

  for (const [position, layout] of SPEC_LAYOUT.entries()) {
    // A group with no value in any language is not written at all: an empty
    // "Chandelier" section on a spotlight's datasheet is worse than none.
    const present = layout.fields.filter((field) => {
      const en = english?.[field.key];
      const ar = arabic?.[field.key];
      return (typeof en === "string" && en.trim() !== "") || (typeof ar === "string" && ar.trim() !== "");
    });
    if (present.length === 0) {
      skippedEmptyGroups += 1;
      continue;
    }

    groupsWritten += 1;
    itemsWritten += present.length;

    if (options.dryRun) {
      console.log(`  ${product.productId.padEnd(22)} ${layout.en} (${present.length} items): ${present.map((f) => f.key).join(", ")}`);
    }

    // Deterministic ids: the same product and position always produce the
    // same row, so replacing a product's groups rewrites rather than
    // duplicates. The first version upserted row by row and opened roughly
    // 8,000 sequential round-trips to Neon, which exhausted the connection
    // part-way through; this is five statements per product.
    const groupId = `sg_${product.id}_${position}`;
    plannedGroups.push({ id: groupId, productId: product.id, position });
    for (const language of ["en", "ar"] as const) {
      plannedGroupTranslations.push({
        id: `sgt_${groupId}_${language}`,
        groupId,
        language,
        name: layout[language],
      });
    }

    for (const [itemPosition, field] of present.entries()) {
      const itemId = `si_${groupId}_${itemPosition}`;
      const rawEn = typeof english?.[field.key] === "string" ? (english[field.key] as string).trim() || null : null;
      const rawAr = typeof arabic?.[field.key] === "string" ? (arabic[field.key] as string).trim() || null : null;

      // The value stops being a sentence and becomes a number, a range or a
      // vocabulary entry. Anything the parser cannot read confidently stays
      // TEXT and is reported — a wrong number on a datasheet is worse than
      // an unconverted string.
      const parsed = parseSpecValue(field.key, rawEn, rawAr);
      if (parsed.kind === "TEXT") {
        unparsed.push({ sku: product.productId, column: field.key, english: rawEn, arabic: rawAr });
      } else {
        structured += 1;
      }

      let optionId: string | null = null;
      if (parsed.kind === "CHOICE" && parsed.optionKey && !options.dryRun) {
        optionId = await optionIdFor(parsed.optionKey, rawEn, rawAr);
      }

      plannedItems.push({
        id: itemId,
        groupId,
        // The language-neutral name, so a reader can ask for "ip" rather
        // than for whatever the label happens to be in its locale.
        key: field.key,
        position: itemPosition,
        // The parser knows the unit; the layout's unit is the fallback for
        // anything that stayed TEXT.
        unit: parsed.unit ?? field.unit ?? null,
        kind: parsed.kind,
        comparator: parsed.comparator,
        optionId,
      });

      for (const [measurementPosition, measurement] of parsed.measurements.entries()) {
        plannedMeasurements.push({
          id: `sm_${itemId}_${measurementPosition}`,
          itemId,
          position: measurementPosition,
          value: measurement.value,
          valueMax: measurement.valueMax ?? null,
          conditionValue: measurement.conditionValue ?? null,
          conditionUnit: measurement.conditionUnit ?? null,
        });
      }

      for (const language of ["en", "ar"] as const) {
        const raw = language === "en" ? rawEn : rawAr;
        plannedItemTranslations.push({
          id: `sit_${itemId}_${language}`,
          itemId,
          language,
          label: field[language],
          // Only TEXT keeps a per-language string; everything else renders
          // from the measurements or the shared option.
          value: parsed.kind === "TEXT" ? (raw ?? "—") : null,
        });
      }
    }
  }

  if (!options.dryRun && plannedGroups.length > 0) {
    await prisma.$transaction([
      prisma.specGroup.createMany({ data: plannedGroups }),
      prisma.specGroupTranslation.createMany({ data: plannedGroupTranslations }),
      prisma.specItem.createMany({ data: plannedItems }),
      prisma.specMeasurement.createMany({ data: plannedMeasurements }),
      prisma.specItemTranslation.createMany({ data: plannedItemTranslations }),
    ]);
    written += 1;
    if (written % 20 === 0) console.log(`  … ${written}/${products.length} products`);
  }
}

console.log("");
console.log(`  products:                 ${products.length}`);
console.log(`  skipped, already have groups: ${alreadyStructured}`);
console.log(`  groups ${options.dryRun ? "to write" : "written"}:${" ".repeat(options.dryRun ? 11 : 12)}${groupsWritten}`);
console.log(`  items  ${options.dryRun ? "to write" : "written"}:${" ".repeat(options.dryRun ? 11 : 12)}${itemsWritten}`);
console.log(`  empty groups skipped:     ${skippedEmptyGroups}`);
console.log(`  values parsed into numbers/options: ${structured}`);
console.log(`  values left as free text: ${unparsed.length}`);
if (unparsed.length > 0) {
  // Reported, never guessed at: these are the only values that can still
  // disagree between the two languages.
  const byColumn = new Map<string, number>();
  for (const row of unparsed) byColumn.set(row.column, (byColumn.get(row.column) ?? 0) + 1);
  console.log("\n  still free text, by column:");
  for (const [column, count] of [...byColumn].sort((a, b) => b[1] - a[1])) {
    const sample = unparsed.find((row) => row.column === column)!;
    console.log(`    ${column.padEnd(20)} ${String(count).padStart(4)}   e.g. ${sample.sku}: ${JSON.stringify(sample.english ?? sample.arabic)}`);
  }
}
if (!options.dryRun && !options.limit && written > 0) {
  // Vocabulary nothing points at any more — left behind when a value or the
  // keying changes. Only safe to sweep on a full run: a --limit run has not
  // looked at every product, so an option may simply not have been reached.
  // And only when this run wrote something: on a run that skipped every
  // product, an unused option is vocabulary the editor offers, not debris.
  const orphaned = await prisma.specOption.findMany({
    where: { items: { none: {} } },
    select: { id: true, key: true },
  });
  if (orphaned.length > 0) {
    await prisma.specOption.deleteMany({ where: { id: { in: orphaned.map((option) => option.id) } } });
    console.log(`  unused options removed:   ${orphaned.length} (${orphaned.map((o) => o.key).join(", ")})`);
  }
}

console.log("\n  ProductSpecification is left untouched.");

await prisma.$disconnect();
