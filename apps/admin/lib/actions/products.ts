"use server";

import { prisma } from "@repo/database";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { ProductColorTemp, ProductIP, ProductChandLamp } from "@repo/database";
import { cloudinary } from "@/lib/cloudinary";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  productImageFolder,
  type CloudinaryUploadResult,
} from "@/lib/uploads.shared";
import { ActionError, run } from "./result";
import * as catalog from "@repo/catalog";
import { serializeMoney } from "@repo/money";

// ─── Product CRUD ──────────────────────────────────────────────

export async function createProduct(data: catalog.CreateProductInput) {
  return run(async () => {
    await requireAdmin();
    const product = await catalog.createProduct(data);
    revalidatePath("/admin/dashboard/products");
    return product;
  });
}

export async function updateProductGeneral(
  productId: string,
  data: {
    productName?: string;
    brand?: string;
    isActive?: boolean;
    featured?: boolean;
    trackInventory?: boolean;
    categoryId?: string;
    lightingtypeId?: string;
    maxIP?: number | null;
    hNumber?: number | null;
    chandelierLightingType?: string | null;
    specSheetUrl?: string | null;
    productColor?: ProductColorTemp;
    productIp?: ProductIP;
    productChandLamp?: ProductChandLamp;
  }
) {
  return run(async () => {
    await requireAdmin();

    const product = await prisma.product.update({ where: { id: productId }, data });
    revalidatePath("/admin/dashboard/products");
    revalidatePath(`/admin/dashboard/products/${productId}`);
    return product;
  });
}

// ─── Translations ───────────────────────────────────────────────
// ProductTranslation and ProductSpecification are keyed on Product.id like
// every other relation here. They used to point at the SKU string, which
// made a SKU unrenameable; the second `productSku` argument these functions
// took is gone with it.

export async function upsertProductTranslation(
  productId: string,
  language: "en" | "ar",
  data: { name: string; description?: string | null }
) {
  return run(async () => {
    await requireAdmin();

    const translation = await prisma.productTranslation.upsert({
      where: { productId_language: { productId, language } },
      update: data,
      create: { productId, language, ...data },
    });

    revalidatePath(`/admin/dashboard/products/${productId}`);
    return translation;
  });
}

// ─── Specifications ─────────────────────────────────────────────

export interface ProductSpecificationInput {
  input?: string | null;
  maximumWattage?: string | null;
  brandOfLed?: string | null;
  luminousFlux?: string | null;
  mainMaterial?: string | null;
  cri?: string | null;
  beamAngle?: string | null;
  workingTemperature?: string | null;
  fixtureDimmable?: string | null;
  electrical?: string | null;
  powerFactor?: string | null;
  colorTemperature?: string | null;
  ip?: string | null;
  energySaving?: string | null;
  lifeTime?: string | null;
  finish?: string | null;
  lampBase?: string | null;
  bulb?: string | null;
}

export async function upsertProductSpecification(
  productId: string,
  language: "en" | "ar",
  data: ProductSpecificationInput
) {
  return run(async () => {
    await requireAdmin();

    const spec = await prisma.productSpecification.upsert({
      where: { productId_language: { productId, language } },
      update: data,
      create: { productId, language, ...data },
    });

    revalidatePath(`/admin/dashboard/products/${productId}`);
    return spec;
  });
}

/** Price changes are owner-only and always go through the audited path. */
export async function updateProductPrice(productId: string, newPrice: string) {
  return run(async () => {
    const admin = await requirePermission("price:write");
    const price = catalog.moneySchema.parse(newPrice);
    const updated = await catalog.setProductPrice(productId, price, admin.id);
    revalidatePath(`/admin/dashboard/products/${productId}`);
    return updated;
  });
}

export async function softDeleteProduct(productId: string) {
  return run(async () => {
    await requireAdmin();
    const product = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isActive: false },
    });
    revalidatePath("/admin/dashboard/products");
    return product;
  });
}

export async function restoreProduct(productId: string) {
  return run(async () => {
    await requireAdmin();
    const product = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: null },
    });
    revalidatePath("/admin/dashboard/products");
    return product;
  });
}

export async function duplicateProduct(productId: string) {
  return run(async () => {
    await requireAdmin();

    // One transaction: a copy that failed half-way would be a product with
    // images but no specs, which is the bug this copy exists to prevent.
    const copy = await prisma.$transaction(
      async (tx) => {
        const source = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: { images: true, variants: true, translations: true, specifications: true },
        });

        const suffix = `-copy-${Date.now().toString(36)}`;

        const copy = await tx.product.create({
          data: {
            productId: `${source.productId}${suffix}`,
            productName: `${source.productName} (Copy)`,
            maxIP: source.maxIP,
            spotlightType: source.spotlightType,
            price: source.price,
            priceIncrease: source.priceIncrease,
            sectionType: source.sectionType,
            brand: source.brand,
            // A copy starts with no promotion: a discount is a Discount row
            // with its own targets now, and a copy is not one of them until
            // someone says so.
            chandelierLightingType: source.chandelierLightingType,
            hNumber: source.hNumber,
            isActive: false, // starts inactive until reviewed
            featured: false,
            categoryId: source.categoryId,
            lightingtypeId: source.lightingtypeId,
            productColor: source.productColor,
            productIp: source.productIp,
            productChandLamp: source.productChandLamp,
            images: {
              create: source.images.map((img) => ({
                url: img.url,
                altText: img.altText,
                order: img.order,
                isPrimary: img.isPrimary,
              })),
            },
            variants: {
              create: source.variants.map((v) => ({
                sku: `${v.sku}${suffix}`,
                wattage: v.wattage,
                colorTemp: v.colorTemp,
                finish: v.finish,
                size: v.size,
                price: v.price,
                isDefault: v.isDefault,
              })),
            },
            translations: {
              create: source.translations.map((tr) => ({
                language: tr.language,
                name: tr.name,
                description: tr.description,
              })),
            },
            // The legacy columns still feed the shop cards' spec line.
            specifications: {
              create: source.specifications.map(
                ({ id: _id, productId: _productId, createdAt: _createdAt, updatedAt: _updatedAt, customSpecs, ...spec }) => ({
                  ...spec,
                  // A JSON column takes no bare null on write; undefined leaves it NULL.
                  customSpecs: customSpecs ?? undefined,
                })
              ),
            },
          },
        });

        // Specs are what the product page, the datasheet and the editor read.
        await catalog.copyProductSpecs(source.id, copy.id, tx);

        // A copy starts with no stock: it opens an empty inventory row rather
        // than inheriting units that were never counted onto its shelf.
        const location = await catalog.defaultLocation(tx);
        const copiedVariants = await tx.productVariant.findMany({
          where: { productId: copy.id },
          select: { id: true },
        });
        await tx.inventoryItem.createMany({
          data: copiedVariants.map((variant) => ({ variantId: variant.id, locationId: location.id })),
        });

        return copy;
      },
      { timeout: 20_000 }
    );

    revalidatePath("/admin/dashboard/products");
    // Ids only: the row carries Decimal money, which cannot cross to the client.
    return { id: copy.id, productId: copy.productId };
  });
}

// ─── Images ─────────────────────────────────────────────────────
// Two ways in: paste an existing URL (addProductImage), or upload a file
// directly to Cloudinary (uploadProductImage). Both land in the same
// ProductImage table — uploaded ones also carry Cloudinary's public_id in
// `providerId` so they can be cleanly deleted later.

export async function addProductImage(productId: string, url: string, altText?: string) {
  return run(async () => {
    await requireAdmin();
    const count = await prisma.productImage.count({ where: { productId } });
    const image = await prisma.productImage.create({
      data: { productId, url, altText, order: count, isPrimary: count === 0 },
    });
    revalidatePath(`/admin/dashboard/products/${productId}`);
    return image;
  });
}


/**
 * Registers an image the browser has already uploaded straight to
 * Cloudinary with a signature from `signProductImageUpload`.
 *
 * The `public_id` is re-read from Cloudinary rather than trusted from the
 * browser: the client posts directly to Cloudinary, so nothing it sends
 * back here has passed through the server, and a forged `secure_url` would
 * otherwise put an arbitrary URL on the product page. The lookup also gives
 * the real dimensions for next/image.
 */
export async function registerUploadedImage(
  productId: string,
  sku: string,
  publicId: string,
) {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("ProductActions");

    if (!publicId.startsWith(`${productImageFolder(sku)}/`)) {
      throw new ActionError(t("errors.invalidType"));
    }

    let asset: CloudinaryUploadResult;
    try {
      asset = (await cloudinary.api.resource(publicId, { resource_type: "image" })) as CloudinaryUploadResult;
    } catch {
      throw new ActionError(t("errors.uploadFailed"));
    }

    const count = await prisma.productImage.count({ where: { productId } });
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: asset.secure_url,
        providerId: asset.public_id,
        width: asset.width ?? null,
        height: asset.height ?? null,
        format: asset.format ?? null,
        bytes: asset.bytes ?? null,
        order: count,
        isPrimary: count === 0,
      },
    });

    revalidatePath(`/admin/dashboard/products/${productId}`);
    return image;
  });
}

/**
 * The old server-side upload: the file arrives base64'd inside a Server
 * Action. Kept as the fallback for when Cloudinary signing is unavailable,
 * and for the image backfill script, which runs on the server anyway.
 */
export async function uploadProductImage(productId: string, sku: string, formData: FormData) {
  return run(async () => {
    await requireAdmin();
    const t = await getTranslations("ProductActions");

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ActionError(t("errors.noFile"));
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      throw new ActionError(t("errors.invalidType"));
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ActionError(t("errors.tooLarge"));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: productImageFolder(sku),
      resource_type: "image",
    });

    const count = await prisma.productImage.count({ where: { productId } });
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: result.secure_url,
        providerId: result.public_id,
        width: result.width ?? null,
        height: result.height ?? null,
        format: result.format ?? null,
        bytes: result.bytes ?? null,
        order: count,
        isPrimary: count === 0,
      },
    });

    revalidatePath(`/admin/dashboard/products/${productId}`);
    return image;
  });
}

export async function removeProductImage(imageId: string, productId: string) {
  return run(async () => {
    await requireAdmin();

    const image = await prisma.productImage.findUniqueOrThrow({ where: { id: imageId } });

    if (image.providerId) {
      try {
        // invalidate: purge the CDN copy too, otherwise the delivery URL keeps
        // serving a deleted image until the cached copy expires.
        await cloudinary.uploader.destroy(image.providerId, { invalidate: true });
      } catch (error) {
        // Best-effort — don't block removing the DB row if the asset is
        // already gone or credentials aren't configured in this environment.
        // Logged rather than swallowed, so a failing delete leaves a trace
        // instead of quietly leaking assets.
        console.error("Cloudinary destroy failed", image.providerId, error);
      }
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    revalidatePath(`/admin/dashboard/products/${productId}`);
  });
}

export async function setPrimaryImage(imageId: string, productId: string) {
  return run(async () => {
    await requireAdmin();
    await prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
      prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    revalidatePath(`/admin/dashboard/products/${productId}`);
  });
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]) {
  return run(async () => {
    await requireAdmin();
    await prisma.$transaction(
      orderedImageIds.map((id, index) =>
        prisma.productImage.update({ where: { id }, data: { order: index } })
      )
    );
    revalidatePath(`/admin/dashboard/products/${productId}`);
  });
}

// ─── Variants / stock ───────────────────────────────────────────

export async function updateVariant(
  variantId: string,
  productId: string,
  data: catalog.UpdateVariantInput
) {
  return run(async () => {
    await requireAdmin();
    // The Product.quantity mirror is kept in step inside the service's
    // transaction — see @repo/catalog's stock module — so it can no longer
    // drift depending on which action touched stock.
    const variant = await catalog.updateVariant(variantId, data);

    revalidatePath(`/admin/dashboard/products/${productId}`);
    return variant;
  });
}

/** What a bulk price edit would do. Read-only, so the admin sees the diff first. */
export async function previewBulkPrice(productIds: string[], operation: catalog.BulkPriceOperation) {
  return run(async () => {
    await requirePermission("price:write");
    return catalog.previewBulkPrice(productIds, operation);
  });
}

/**
 * Applies a bulk price edit. One transaction for every product, with a
 * PriceHistory row per price that actually moved: a failure part-way
 * through leaves no product changed.
 */
export async function applyBulkPrice(productIds: string[], operation: catalog.BulkPriceOperation) {
  return run(async () => {
    const admin = await requirePermission("price:write");
    const result = await catalog.applyBulkPrice(productIds, operation, admin.id);
    revalidatePath("/admin/dashboard/products");
    return result;
  });
}

/**
 * Turns inventory tracking on or off for several products at once — the
 * way to mark a whole line as made to order (every LED strip, say) without
 * opening each one. product:write, not price:write: whether stock limits a
 * sale is a catalogue decision, and staff who edit products make it.
 */
export async function setProductsTrackInventory(ids: string[], track: boolean) {
  return run(async () => {
    await requirePermission("product:write");
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { trackInventory: track },
    });
    revalidatePath("/admin/dashboard/products");
    revalidatePath("/admin/dashboard/inventory");
    return { updated: count };
  });
}
