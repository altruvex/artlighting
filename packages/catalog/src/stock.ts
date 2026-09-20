import type { Db } from "./client";

/**
 * Stock has one source of truth: the product's default `ProductVariant`.
 *
 * `Product.quantity` is a legacy mirror that the storefront still reads. It
 * is kept in step here, inside the caller's transaction, rather than in each
 * action — the previous version updated it in `updateVariant` only, so any
 * other path that touched stock left the two disagreeing. The column goes
 * away in its own migration once the storefront reads the variant.
 */
export async function syncProductQuantityFromDefaultVariant(db: Db, productId: string): Promise<number | null> {
  const defaultVariant = await db.productVariant.findFirst({
    where: { productId, isDefault: true },
    select: { stock: true },
  });
  if (!defaultVariant) return null;

  await db.product.update({
    where: { id: productId },
    data: { quantity: defaultVariant.stock },
  });
  return defaultVariant.stock;
}

/**
 * Products whose legacy `Product.quantity` disagrees with their default
 * variant. Read-only: the backfill script uses it for its dry run, and the
 * same rows are what a repair would write.
 */
export async function findStockDrift(db: Db): Promise<
  { productId: string; sku: string; productQuantity: number; variantStock: number }[]
> {
  const products = await db.product.findMany({
    select: {
      id: true,
      productId: true,
      quantity: true,
      variants: { where: { isDefault: true }, select: { stock: true }, take: 1 },
    },
  });

  return products.flatMap((product) => {
    const variantStock = product.variants[0]?.stock;
    if (variantStock === undefined || variantStock === product.quantity) return [];
    return [
      {
        productId: product.id,
        sku: product.productId,
        productQuantity: product.quantity,
        variantStock,
      },
    ];
  });
}
