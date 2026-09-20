/**
 * Two pieces of product data that point at things which are not there.
 *
 * **An image row for a file that was never shipped.** Every image lives in
 * Cloudinary except one, which still holds the local path it had before the
 * migration — and that file is not in `public/`. next/image asks for it on
 * every view of an active product and gets a 404, where a product with no
 * image row at all falls back to the placeholder cleanly. The row goes; the
 * product still needs a photograph, and the script says so rather than
 * leaving that to be noticed.
 *
 * **Bulbs offered by a fixture with nowhere to put one.** The bulb seed used
 * `hNumber > 0`, which is the right rule for a chandelier with sockets. One
 * LED fixture carries an arm count it cannot have: MC7021 is a single
 * continuous LED bar hung on two cables — the photograph shows no arms and
 * no sockets, it records no lamp base, no bulb spec and in fact no
 * specifications at all, and it is the only LED chandelier in the catalogue
 * with an arm count. Left alone, the storefront offers a bulb on it and
 * charges 15 an arm for one that cannot be fitted.
 *
 * The offer is removed by rule — an LED fixture with no socket recorded has
 * nowhere to screw a bulb — and the arm count by name, because "the picture
 * shows a bar, not arms" is a correction and not a rule.
 *
 * Idempotent: a second run reports nothing to do.
 *
 * Run: pnpm --filter @repo/catalog fix:orphans -- --dry-run
 *      pnpm --filter @repo/catalog fix:orphans -- --apply
 */
import { existsSync } from "node:fs";
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");

reportHeader("Fix: product data pointing at things that are not there", options, hostOf(databaseUrl()));

/** Where a local image path would have to resolve to. */
const PUBLIC_DIR = new URL("../../../apps/web/public", import.meta.url).pathname;

/** A fixture the photograph settles; see the note above. */
const NO_ARMS = ["mc7021"];

// ── 1. image rows whose file is not there ──────────────────────────────
const images = await prisma.productImage.findMany({
  select: { id: true, url: true, product: { select: { productId: true, isActive: true } } },
});

const dangling = images.filter((image) => {
  if (image.url.startsWith("http://") || image.url.startsWith("https://")) return false;
  return !existsSync(`${PUBLIC_DIR}${image.url.startsWith("/") ? "" : "/"}${image.url}`);
});

// ── 2. bulbs offered where no bulb goes ────────────────────────────────
const fixtures = await prisma.product.findMany({
  where: { bulbs: { some: {} } },
  select: {
    id: true,
    productId: true,
    hNumber: true,
    chandelierLightingType: true,
    bulbs: { select: { bulbId: true } },
    specGroups: { select: { items: { where: { key: { in: ["lampBase", "bulb"] } }, select: { id: true } } } },
  },
  orderBy: { productId: "asc" },
});

const socketless = fixtures.filter(
  (fixture) =>
    fixture.chandelierLightingType === "LED" &&
    fixture.specGroups.flatMap((group) => group.items).length === 0,
);

const phantomArms = await prisma.product.findMany({
  where: { productId: { in: NO_ARMS }, hNumber: { not: null } },
  select: { id: true, productId: true, hNumber: true },
});

console.log(`  image rows checked:              ${images.length}`);
console.log(`  pointing at a missing file:      ${dangling.length}`);
console.log(`  fixtures offering bulbs:         ${fixtures.length}`);
console.log(`  of those with nowhere to fit one:${socketless.length}`);
console.log(`  arm counts to clear:             ${phantomArms.length}`);
console.log("");

for (const image of dangling) {
  console.log(`  ${image.product.productId.padEnd(12)} drop image row -> ${image.url}`);
}
for (const fixture of socketless) {
  console.log(`  ${fixture.productId.padEnd(12)} drop ${fixture.bulbs.length} bulb offer(s) — LED, no socket recorded`);
}
for (const product of phantomArms) {
  console.log(`  ${product.productId.padEnd(12)} clear arms (${product.hNumber}) — the photograph shows a bar, not arms`);
}

const nothing = dangling.length === 0 && socketless.length === 0 && phantomArms.length === 0;
if (nothing) {
  console.log("  Nothing to do.");
} else if (options.dryRun) {
  console.log("");
  console.log("  DRY RUN — nothing was written.");
} else {
  if (dangling.length > 0) {
    await prisma.productImage.deleteMany({ where: { id: { in: dangling.map((image) => image.id) } } });
  }
  for (const fixture of socketless) {
    await prisma.productBulb.deleteMany({ where: { productId: fixture.id } });
  }
  for (const product of phantomArms) {
    await prisma.product.update({ where: { id: product.id }, data: { hNumber: null } });
  }
  console.log("");
  console.log(
    `  Wrote: ${dangling.length} image row(s), ${socketless.length} fixture(s) unfitted, ${phantomArms.length} arm count(s) cleared.`,
  );
}

// Said plainly rather than left to be noticed: a live product with no image
// shows a placeholder to every customer until someone supplies a photograph.
const withoutImages = await prisma.product.findMany({
  where: { isActive: true, images: { none: {} } },
  select: { productId: true },
  orderBy: { productId: "asc" },
});
const stillMissing = options.dryRun
  ? [...withoutImages.map((p) => p.productId), ...dangling.map((d) => d.product.productId)]
  : withoutImages.map((p) => p.productId);

if (stillMissing.length > 0) {
  console.log("");
  console.log(`  Active products with no photograph (${new Set(stillMissing).size}) — these render a placeholder:`);
  for (const productId of new Set(stillMissing)) console.log(`    ${productId}`);
}

await prisma.$disconnect();
