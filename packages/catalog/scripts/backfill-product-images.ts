/**
 * Uploads the product images that still live in `apps/web/public` to
 * Cloudinary and points the `ProductImage` rows at the hosted copies,
 * filling in the dimensions the new columns hold.
 *
 * **Idempotent by construction.** Each image gets a deterministic
 * `public_id` — `products/<sku>/<order>` — and is uploaded with
 * `overwrite: true`, so running this twice replaces the same asset rather
 * than creating a second copy. Rows that already point at Cloudinary are
 * skipped entirely, so a re-run after a partial failure only does the
 * remaining work.
 *
 * **Nothing is deleted.** The files under `public/` and the legacy
 * `Product.productImages[]` array both stay until Ali confirms; this only
 * rewrites `ProductImage.url`.
 *
 * Run: pnpm --filter @repo/catalog backfill:images -- --dry-run
 *      pnpm --filter @repo/catalog backfill:images -- --apply --limit=5
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";

const options = parseBackfillArgs(process.argv.slice(2));
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();

// The Cloudinary credentials live with the apps, not this package, so the
// script reads them from the admin's env alongside its own. dotenv does not
// overwrite what is already set, so this cannot move the database URL — and
// the guard runs again afterwards rather than relying on that.
loadEnv(new URL("../../../apps/admin", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { v2: cloudinary } = await import("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

const PUBLIC_DIR = new URL("../../../apps/web/public", import.meta.url).pathname;

reportHeader("Backfill: /public product images → Cloudinary", options, hostOf(databaseUrl()));

if (!options.dryRun && !process.env.CLOUD_API_SECRET) {
  throw new Error("CLOUD_NAME / CLOUD_API_KEY / CLOUD_API_SECRET must be set to apply this backfill.");
}

/**
 * The same asset always lands on the same Cloudinary id, which is what
 * makes a re-run an overwrite instead of a duplicate. `order` rather than
 * the file name: the file names contain spaces and parentheses, and the
 * order is what the storefront actually shows images by.
 */
function publicIdFor(sku: string, order: number): string {
  const id = `products/${sku}/${order}`;
  return options.idPrefix ? `${options.idPrefix}/${id}` : id;
}

const products = await prisma.product.findMany({
  where: { images: { some: { url: { startsWith: "/" } } } },
  select: {
    id: true,
    productId: true,
    images: { where: { url: { startsWith: "/" } }, orderBy: { order: "asc" }, select: { id: true, url: true, order: true } },
  },
  orderBy: { productId: "asc" },
  ...(options.limit ? { take: options.limit } : {}),
});

let pending = 0;
let missing = 0;
let uploaded = 0;
const missingFiles: string[] = [];

for (const product of products) {
  for (const image of product.images) {
    const absolute = join(PUBLIC_DIR, decodeURIComponent(image.url));
    if (!existsSync(absolute)) {
      missing += 1;
      missingFiles.push(`${product.productId}: ${image.url}`);
      continue;
    }
    pending += 1;
    const target = publicIdFor(product.productId, image.order);

    if (options.dryRun) {
      const bytes = statSync(absolute).size;
      console.log(`  ${product.productId.padEnd(22)} ${image.url}`);
      console.log(`  ${" ".repeat(22)}   → ${target}  (${(bytes / 1024).toFixed(0)} KB)`);
      continue;
    }

    const result = await cloudinary.uploader.upload(absolute, {
      public_id: target,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    });

    await prisma.productImage.update({
      where: { id: image.id },
      data: {
        url: result.secure_url,
        providerId: result.public_id,
        width: result.width ?? null,
        height: result.height ?? null,
        format: result.format ?? null,
        bytes: result.bytes ?? null,
      },
    });
    uploaded += 1;
    console.log(`  uploaded ${product.productId} #${image.order} → ${result.public_id}`);
  }
}

console.log("");
console.log(`  products with local images: ${products.length}`);
console.log(`  images ${options.dryRun ? "that would be uploaded" : "uploaded"}: ${options.dryRun ? pending : uploaded}`);
if (missing > 0) {
  console.log(`  images whose file is missing from public/: ${missing}`);
  for (const entry of missingFiles.slice(0, 20)) console.log(`    ${entry}`);
  if (missingFiles.length > 20) console.log(`    … and ${missingFiles.length - 20} more`);
}
console.log("\n  The files under public/ and Product.productImages[] are left untouched.");

await prisma.$disconnect();
