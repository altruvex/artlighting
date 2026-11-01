/**
 * Imports the Balcom outdoor "new collection" (2026) — the bollards and
 * poles in `scripts/data/balcom-outdoor-2026.ts` — as catalogue products:
 * the product and its variant, both translations, the spec groups, and the
 * images, uploaded to Cloudinary.
 *
 * **Re-runnable.** A product whose code already exists is skipped whole, so
 * a second run only adds what the first did not. Each product's rows are
 * written in one transaction; the images are uploaded before it, to the
 * deterministic `products/<sku>/<order>` ids with `overwrite: true`, so an
 * upload repeated after a failed transaction replaces the same asset.
 *
 * **The dry run writes nothing but still exercises the writes**: every
 * product's transaction runs and is then rolled back, so a spec value the
 * parser rejects fails the dry run rather than the real one. Images are not
 * uploaded in a dry run.
 *
 * The images come from a manifest produced when the datasheet deck was
 * unpacked: `{ "<sku>": [{ file, role, width, height, bytes }, ...] }`, in
 * display order, the product photo first.
 *
 * Run: pnpm --filter @repo/catalog import:balcom-outdoor -- --dry-run --images=<manifest.json>
 *      pnpm --filter @repo/catalog import:balcom-outdoor -- --apply --images=<manifest.json>
 */
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../../database/load-env";
import { parseBackfillArgs, reportHeader } from "./backfill-shared";
import { COLLECTION, EXTRA_GROUP_ARABIC, PLACEHOLDER_PRICE, type Subcategory } from "./data/balcom-outdoor-2026";

const argv = process.argv.slice(2);
const options = parseBackfillArgs(argv);
loadEnv(new URL("../../database", import.meta.url).pathname);
assertNotProduction();
// Cloudinary and the storefront's revalidation secret live with the admin.
loadEnv(new URL("../../../apps/admin", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("@repo/database");
const { createProduct, applySpecChanges } = await import("../src/index");
const { v2: cloudinary } = await import("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

type ImageRole = "PHOTO" | "DRAWING" | "APPLICATION";
interface ManifestImage {
  file: string;
  role: ImageRole;
  width: number;
  height: number;
  bytes: number;
}

const imagesFlag = argv.find((arg) => arg.startsWith("--images="));
if (!imagesFlag) throw new Error("Pass --images=<manifest.json>, the image manifest for this collection.");
const manifest = JSON.parse(readFileSync(imagesFlag.slice("--images=".length), "utf8")) as Record<string, ManifestImage[]>;

reportHeader("Import: Balcom outdoor collection 2026", options, hostOf(databaseUrl()));

if (!options.dryRun && !process.env.CLOUD_API_SECRET) {
  throw new Error("CLOUD_NAME / CLOUD_API_KEY / CLOUD_API_SECRET must be set to apply this import.");
}

// Every product must have its pictures before anything is written.
for (const product of COLLECTION) {
  const images = manifest[product.sku];
  if (!images?.length) throw new Error(`${product.sku}: no images in the manifest.`);
  for (const image of images) if (!existsSync(image.file)) throw new Error(`${product.sku}: missing ${image.file}`);
}

const publicIdFor = (sku: string, order: number) =>
  options.idPrefix ? `${options.idPrefix}/products/${sku}/${order}` : `products/${sku}/${order}`;

/** The outdoor family and its subcategories. `pole` is new with this collection. */
const outdoor = await prisma.category.findUniqueOrThrow({ where: { slug: "outdoor" }, select: { id: true } });
const SUBCATEGORY_NAMES: Record<Subcategory, { en: string; ar: string }> = {
  bollard: { en: "Bollard", ar: "بولارد" },
  pole: { en: "Pole", ar: "عمود إنارة" },
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** The subcategory's id, creating it under outdoor the first time. */
async function ensureSubcategory(db: typeof prisma | Tx, slug: Subcategory): Promise<string> {
  const existing = await db.category.findUnique({ where: { slug }, select: { id: true, parentId: true } });
  if (existing) {
    if (existing.parentId !== outdoor.id) throw new Error(`Category "${slug}" exists but is not under outdoor.`);
    return existing.id;
  }
  const names = SUBCATEGORY_NAMES[slug];
  const created = await db.category.create({
    data: {
      name: names.en,
      slug,
      parentId: outdoor.id,
      translations: { create: [{ language: "en", name: names.en }, { language: "ar", name: names.ar }] },
    },
    select: { id: true },
  });
  if (!options.dryRun) console.log(`  created category ${slug} (${names.en} / ${names.ar})`);
  return created.id;
}

if (options.dryRun) {
  for (const slug of new Set(COLLECTION.map((p) => p.subcategory))) {
    if (!(await prisma.category.findUnique({ where: { slug } }))) console.log(`  would create category ${slug} under outdoor`);
  }
} else {
  for (const slug of new Set(COLLECTION.map((p) => p.subcategory))) await ensureSubcategory(prisma, slug);
}

const existing = new Set(
  (
    await prisma.product.findMany({
      where: { productId: { in: COLLECTION.map((p) => p.sku) } },
      select: { productId: true },
    })
  ).map((p) => p.productId)
);

class DryRunRollback extends Error {}

let created = 0;
let skipped = 0;
const products = options.limit ? COLLECTION.slice(0, options.limit) : COLLECTION;

for (const product of products) {
  const code = product.sku.toUpperCase();
  if (existing.has(product.sku)) {
    skipped += 1;
    console.log(`  skip   ${code} (already in the catalogue)`);
    continue;
  }
  const images = manifest[product.sku]!;
  const uploads: {
    url: string;
    providerId: string;
    format?: string;
    image: ManifestImage;
    result?: { width?: number; height?: number; bytes?: number };
  }[] = [];
  for (const [order, image] of images.entries()) {
    if (options.dryRun) {
      uploads.push({ url: `(dry run) ${image.file}`, providerId: publicIdFor(product.sku, order), format: extname(image.file).slice(1), image });
      continue;
    }
    const result = await cloudinary.uploader.upload(image.file, {
      public_id: publicIdFor(product.sku, order),
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    });
    uploads.push({ url: result.secure_url, providerId: result.public_id, format: result.format, image, result });
  }

  try {
    const warnings = await prisma.$transaction(
      async (tx) => {
        // Found, or in a dry run created inside this rolled-back transaction.
        const lightingtypeId = await ensureSubcategory(tx, product.subcategory);
        const row = await createProduct(
          {
            productId: product.sku,
            productName: code,
            brand: "balcom",
            sectionType: "OUTDOOR",
            spotlightType: product.subcategory,
            categoryId: outdoor.id,
            lightingtypeId,
            price: PLACEHOLDER_PRICE,
            stock: 0,
          },
          tx
        );
        // Made to order: without this a product with no stock counted
        // shows as sold out.
        await tx.product.update({
          where: { id: row.id },
          data: { maxIP: 65, productIp: "IP65", trackInventory: false },
        });
        await tx.productVariant.updateMany({ where: { productId: row.id }, data: { wattage: product.wattage } });
        await tx.productTranslation.createMany({
          data: [
            { productId: row.id, language: "en", name: code, description: product.description.en },
            { productId: row.id, language: "ar", name: code, description: product.description.ar },
          ],
        });

        const { warnings } = await applySpecChanges(row.id, { edits: [], additions: product.specs }, tx);
        // Groups outside the catalogue layout are created with the English
        // name in both languages.
        for (const [en, ar] of Object.entries(EXTRA_GROUP_ARABIC)) {
          await tx.specGroupTranslation.updateMany({
            where: { language: "ar", name: en, group: { productId: row.id } },
            data: { name: ar },
          });
        }

        await tx.productImage.createMany({
          data: uploads.map((upload, order) => ({
            productId: row.id,
            url: upload.url,
            providerId: upload.providerId,
            altText: code,
            order,
            isPrimary: order === 0,
            role: upload.image.role,
            width: upload.result?.width ?? upload.image.width,
            height: upload.result?.height ?? upload.image.height,
            format: upload.format ?? null,
            bytes: upload.result?.bytes ?? upload.image.bytes,
          })),
        });

        if (options.dryRun) throw new DryRunRollback(JSON.stringify(warnings));
        return warnings;
      },
      { timeout: 60_000, maxWait: 10_000 }
    );
    created += 1;
    console.log(`  create ${code}: ${product.specs.length} specs, ${uploads.length} images`);
    for (const warning of warnings) console.log(`         warning: ${warning.kind} — ${warning.label}`);
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
    created += 1;
    console.log(`  would create ${code}: ${product.specs.length} specs, ${uploads.length} images (rehearsed, rolled back)`);
    for (const warning of JSON.parse(error.message) as { kind: string; label: string }[]) {
      console.log(`         warning: ${warning.kind} — ${warning.label}`);
    }
  }
}

console.log("");
console.log(`  products ${options.dryRun ? "that would be created" : "created"}: ${created}`);
console.log(`  already in the catalogue: ${skipped}`);

// A script cannot call the admin's revalidateStorefront(); this is the same
// request it makes.
if (!options.dryRun && created > 0) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!base || !secret) {
    console.log("  storefront not revalidated: NEXT_PUBLIC_APP_URL / STOREFRONT_REVALIDATE_SECRET not set");
  } else {
    try {
      const response = await fetch(new URL("/api/revalidate", base), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ tags: ["catalogue"] }),
        signal: AbortSignal.timeout(5_000),
      });
      console.log(`  storefront revalidation (${base}): ${response.status}`);
    } catch (error) {
      console.log(`  storefront revalidation (${base}) failed: ${(error as Error).message}`);
    }
  }
}

await prisma.$disconnect();
