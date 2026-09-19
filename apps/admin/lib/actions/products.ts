"use server";

import { prisma } from "@repo/database";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { ProductColorTemp, ProductIP, ProductChandLamp } from "@repo/database";
import { cloudinary } from "@/lib/cloudinary";

// ─── Product CRUD ──────────────────────────────────────────────

export async function createProduct(data: {
  productId: string;
  productName: string;
  brand: string;
  sectionType: string;
  spotlightType: string;
  categoryId: string;
  lightingtypeId: string;
  price: number;
  quantity: number;
}) {
  await requireAdmin();

  const product = await prisma.product.create({
    data: {
      productId: data.productId,
      productName: data.productName,
      brand: data.brand,
      sectionType: data.sectionType,
      spotlightType: data.spotlightType,
      categoryId: data.categoryId,
      lightingtypeId: data.lightingtypeId,
      price: data.price,
      quantity: data.quantity,
      productImages: [],
    },
  });

  // Every product gets a default variant, matching the migration script's
  // convention (one purchasable configuration per product today).
  await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: product.productId,
      stock: product.quantity,
      isDefault: true,
    },
  });

  revalidatePath("/admin/dashboard/products");
  return product;
}

export async function updateProductGeneral(
  productId: string,
  data: {
    productName?: string;
    brand?: string;
    isActive?: boolean;
    featured?: boolean;
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
  await requireAdmin();

  const product = await prisma.product.update({ where: { id: productId }, data });
  revalidatePath("/admin/dashboard/products");
  revalidatePath(`/admin/dashboard/products/${productId}`);
  return product;
}

// ─── Translations ───────────────────────────────────────────────
// NOTE: ProductTranslation.productId references Product.productId (the SKU
// string, e.g. "jy-202-15w"), NOT Product.id (the cuid) — unlike every other
// relation in this file. Both are passed in explicitly to avoid mixing them
// up: productCuid only for revalidatePath, productSku for the actual upsert.

export async function upsertProductTranslation(
  productCuid: string,
  productSku: string,
  language: "en" | "ar",
  data: { name: string; description?: string | null }
) {
  await requireAdmin();

  const translation = await prisma.productTranslation.upsert({
    where: { productId_language: { productId: productSku, language } },
    update: data,
    create: { productId: productSku, language, ...data },
  });

  revalidatePath(`/admin/dashboard/products/${productCuid}`);
  return translation;
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

/** Same productId caveat as upsertProductTranslation above — SKU, not cuid. */
export async function upsertProductSpecification(
  productCuid: string,
  productSku: string,
  language: "en" | "ar",
  data: ProductSpecificationInput
) {
  await requireAdmin();

  const spec = await prisma.productSpecification.upsert({
    where: { productId_language: { productId: productSku, language } },
    update: data,
    create: { productId: productSku, language, ...data },
  });

  revalidatePath(`/admin/dashboard/products/${productCuid}`);
  return spec;
}

/** Price changes are owner-only and always go through the audited path. */
export async function updateProductPrice(productId: string, newPrice: number) {
  const admin = await requirePermission("price:write");
  const updated = await prisma.product.updatePrice(productId, newPrice, admin.id);
  revalidatePath(`/admin/dashboard/products/${productId}`);
  return updated;
}

export async function softDeleteProduct(productId: string) {
  await requireAdmin();
  const product = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePath("/admin/dashboard/products");
  return product;
}

export async function restoreProduct(productId: string) {
  await requireAdmin();
  const product = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: null },
  });
  revalidatePath("/admin/dashboard/products");
  return product;
}

export async function duplicateProduct(productId: string) {
  await requireAdmin();

  const source = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { images: true, variants: true },
  });

  const newProductId = `${source.productId}-copy-${Date.now().toString(36)}`;

  const copy = await prisma.product.create({
    data: {
      productId: newProductId,
      productName: `${source.productName} (Copy)`,
      productImages: source.productImages,
      maxIP: source.maxIP,
      spotlightType: source.spotlightType,
      price: source.price,
      priceIncrease: source.priceIncrease,
      sectionType: source.sectionType,
      quantity: 0, // new copy starts with no stock, admin sets it deliberately
      brand: source.brand,
      discount: source.discount,
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
          sku: `${v.sku}-copy-${Date.now().toString(36)}`,
          wattage: v.wattage,
          colorTemp: v.colorTemp,
          finish: v.finish,
          size: v.size,
          stock: 0,
          priceOverride: v.priceOverride,
          isDefault: v.isDefault,
        })),
      },
    },
  });

  revalidatePath("/admin/dashboard/products");
  return copy;
}

// ─── Images ─────────────────────────────────────────────────────
// Two ways in: paste an existing URL (addProductImage), or upload a file
// directly to Cloudinary (uploadProductImage). Both land in the same
// ProductImage table — uploaded ones also carry Cloudinary's public_id in
// `providerId` so they can be cleanly deleted later.

export async function addProductImage(productId: string, url: string, altText?: string) {
  await requireAdmin();
  const count = await prisma.productImage.count({ where: { productId } });
  const image = await prisma.productImage.create({
    data: { productId, url, altText, order: count, isPrimary: count === 0 },
  });
  revalidatePath(`/admin/dashboard/products/${productId}`);
  return image;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function uploadProductImage(productId: string, sku: string, formData: FormData) {
  await requireAdmin();
  const t = await getTranslations("ProductActions");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error(t("errors.noFile"));
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(t("errors.invalidType"));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(t("errors.tooLarge"));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `products/${sku}`,
    resource_type: "image",
  });

  const count = await prisma.productImage.count({ where: { productId } });
  const image = await prisma.productImage.create({
    data: {
      productId,
      url: result.secure_url,
      providerId: result.public_id,
      order: count,
      isPrimary: count === 0,
    },
  });

  revalidatePath(`/admin/dashboard/products/${productId}`);
  return image;
}

export async function removeProductImage(imageId: string, productId: string) {
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
}

export async function setPrimaryImage(imageId: string, productId: string) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/admin/dashboard/products/${productId}`);
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    orderedImageIds.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/dashboard/products/${productId}`);
}

// ─── Variants / stock ───────────────────────────────────────────

export async function updateVariant(
  variantId: string,
  productId: string,
  data: {
    wattage?: string | null;
    finish?: string | null;
    size?: string | null;
    stock?: number;
    priceOverride?: number | null;
  }
) {
  await requireAdmin();
  const variant = await prisma.productVariant.update({ where: { id: variantId }, data });

  // Keep Product.quantity in sync for the default variant, since the
  // storefront still reads Product.quantity directly (see schema.prisma
  // comment on ProductVariant).
  if (variant.isDefault && typeof data.stock === "number") {
    await prisma.product.update({
      where: { id: productId },
      data: { quantity: data.stock },
    });
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  return variant;
}
