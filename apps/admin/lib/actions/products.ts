"use server";

import { prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront";
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
import { z } from "zod";

// ─── Product CRUD ──────────────────────────────────────────────

export async function createProduct(data: catalog.CreateProductInput) {
  return run(async () => {
    await requirePermission("product:write");
    const product = await catalog.createProduct(data);
    revalidateStorefront();
    revalidatePath("/dashboard/products");
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
    await requirePermission("product:write");

    const product = await prisma.product.update({ where: { id: productId }, data });
    revalidateStorefront();
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${productId}`);
    return product;
  });
}

// ─── Translations ───────────────────────────────────────────────
// ProductTranslation is keyed on Product.id like every other relation
// here. It used to point at the SKU string, which made a SKU unrenameable;
// the second `productSku` argument this function took is gone with it.

export async function upsertProductTranslation(
  productId: string,
  language: "en" | "ar",
  data: { name: string; description?: string | null }
) {
  return run(async () => {
    await requirePermission("product:write");

    const translation = await prisma.productTranslation.upsert({
      where: { productId_language: { productId, language } },
      update: data,
      create: { productId, language, ...data },
    });

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
    return translation;
  });
}

// ─── Specifications ─────────────────────────────────────────────
// Specs live in SpecGroup / SpecItem — the tables the product page and the
// datasheet read — and are written through @repo/catalog, which parses the
// English text into numbers and vocabulary entries the same way the
// backfill did. The legacy ProductSpecification columns are no longer
// written from here: nothing on the storefront reads them for a product
// that has spec groups, so edits made there never reached the product page.

const specText = (max: number) => z.string().trim().max(max);

const productSpecChangesSchema = z.object({
  edits: z
    .array(
      z.object({
        itemId: z.string().min(1).max(64),
        value: specText(160).optional(),
        valueAr: specText(160).optional(),
        label: specText(80).optional(),
        labelAr: specText(80).optional(),
      })
    )
    .max(200),
  additions: z
    .array(
      z.object({
        groupName: specText(40).min(1),
        key: specText(40).optional(),
        label: specText(80).optional(),
        labelAr: specText(80).optional(),
        value: specText(160).min(1),
        valueAr: specText(160).optional(),
      })
    )
    .max(100),
  removals: z.array(z.string().min(1).max(64)).max(200),
});

export type ProductSpecChanges = z.infer<typeof productSpecChangesSchema>;

export async function saveProductSpecs(productId: string, input: ProductSpecChanges) {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("ProductEditor.specifications");
    const parsed = productSpecChangesSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("invalid"));

    let written: Awaited<ReturnType<typeof catalog.applySpecChanges>>;
    try {
      written = await catalog.applySpecChanges(productId, parsed.data);
    } catch (error) {
      console.error("product spec save failed", error);
      throw new ActionError(t("saveFailed"));
    }

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
    revalidatePath(`/dashboard/products/${productId}/datasheet`);
    return { arabicToReview: [...new Set(written.warnings.map((w) => w.label))] };
  });
}

/** Price changes are owner-only and always go through the audited path. */
export async function updateProductPrice(productId: string, newPrice: string) {
  return run(async () => {
    const admin = await requirePermission("price:write");
    const price = catalog.moneySchema.parse(newPrice);
    const updated = await catalog.setProductPrice(productId, price, admin.id);
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
    return updated;
  });
}

export async function softDeleteProduct(productId: string) {
  return run(async () => {
    await requirePermission("product:write");
    const product = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isActive: false },
    });
    revalidateStorefront();
    revalidatePath("/dashboard/products");
    return product;
  });
}

export async function restoreProduct(productId: string) {
  return run(async () => {
    await requirePermission("product:write");
    const product = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: null },
    });
    revalidateStorefront();
    revalidatePath("/dashboard/products");
    return product;
  });
}

export async function duplicateProduct(productId: string) {
  return run(async () => {
    await requirePermission("product:write");

    // One transaction: a copy that failed half-way would be a product with
    // images but no specs, which is the bug this copy exists to prevent.
    const copy = await prisma.$transaction(
      async (tx) => {
        const source = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: { images: true, variants: true, translations: true },
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
                role: img.role,
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

    revalidateStorefront();
    revalidatePath("/dashboard/products");
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
    await requirePermission("product:write");
    const count = await prisma.productImage.count({ where: { productId } });
    const image = await prisma.productImage.create({
      data: { productId, url, altText, order: count, isPrimary: count === 0 },
    });
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
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

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
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
    await requirePermission("product:write");
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

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
    return image;
  });
}

export async function removeProductImage(imageId: string, productId: string) {
  return run(async () => {
    await requirePermission("product:write");

    // Scoped to the product: an id from another product's page must not
    // delete this one's image and then revalidate the wrong page.
    const image = await prisma.productImage.findFirstOrThrow({ where: { id: imageId, productId } });

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
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
  });
}

export async function setPrimaryImage(imageId: string, productId: string) {
  return run(async () => {
    await requirePermission("product:write");
    await prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
      // updateMany so an image of another product matches nothing, instead
      // of becoming primary while this product is left with none.
      prisma.productImage.updateMany({ where: { id: imageId, productId }, data: { isPrimary: true } }),
    ]);
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
  });
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]) {
  return run(async () => {
    await requirePermission("product:write");
    await prisma.$transaction(
      orderedImageIds.map((id, index) =>
        prisma.productImage.updateMany({ where: { id, productId }, data: { order: index } })
      )
    );
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
  });
}

/**
 * What a picture shows, for the datasheet: the product photo, a dimensioned
 * drawing, or the installed shot. Null clears it back to the position rule.
 */
export async function setProductImageRole(
  imageId: string,
  productId: string,
  role: "PHOTO" | "DRAWING" | "APPLICATION" | null
) {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("ProductEditor.images.errors");
    if (role !== null && !["PHOTO", "DRAWING", "APPLICATION"].includes(role)) {
      throw new ActionError(t("roleInvalid"));
    }
    await prisma.$transaction(async (tx) => {
      // One photo and one installed shot per product: marking a second one
      // moves the role rather than leaving the sheet to pick between two.
      if (role === "PHOTO" || role === "APPLICATION") {
        await tx.productImage.updateMany({
          where: { productId, role, NOT: { id: imageId } },
          data: { role: null },
        });
      }
      const { count } = await tx.productImage.updateMany({
        where: { id: imageId, productId },
        data: { role },
      });
      if (count === 0) throw new ActionError(t("notFound"));
    });
    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
  });
}

// ─── Variants / stock ───────────────────────────────────────────

export async function updateVariant(
  variantId: string,
  productId: string,
  data: catalog.UpdateVariantInput
) {
  return run(async () => {
    const admin = await requirePermission("product:write");
    // A variant row carries a price override and a stock count as well as
    // its descriptive fields; each is gated by its own permission, as the
    // product's own price and the inventory page are.
    if (data.priceOverride !== undefined && !can(admin.role, "price:write")) await requirePermission("price:write");
    if (data.stock !== undefined && !can(admin.role, "stock:write")) await requirePermission("stock:write");
    // The Product.quantity mirror is kept in step inside the service's
    // transaction — see @repo/catalog's stock module — so it can no longer
    // drift depending on which action touched stock.
    const variant = await catalog.updateVariant(variantId, data, admin.id);

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
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
    revalidateStorefront();
    revalidatePath("/dashboard/products");
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
    revalidateStorefront();
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/inventory");
    return { updated: count };
  });
}
