/**
 * Where a product's images come from.
 *
 * `ProductImage` is the only source. It replaced a `Product.productImages[]`
 * array of relative `/public` paths, which was dropped once every reader
 * came through here — ordered, with a primary flag, a Cloudinary
 * `public_id` and real dimensions.
 */
export interface ProductImageRow {
  url: string;
  order?: number;
  isPrimary?: boolean;
}

/**
 * The Prisma select every image-reading query shares. A function, not a
 * constant: Prisma's generated argument types reject a readonly `orderBy`,
 * so each call gets its own mutable object.
 */
export function productImageSelect() {
  return {
    select: { url: true, order: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" as const }, { order: "asc" as const }],
  };
}

export function imageUrls(product: { images?: ProductImageRow[] | null }): string[] {
  const rows = product.images;
  if (rows && rows.length > 0) {
    return [...rows]
      .sort((a, b) => {
        // Primary first, then the admin's order — the same order the
        // PRODUCT_IMAGE_SELECT asks Postgres for, repeated here because a
        // caller may hand over rows it fetched some other way.
        if (Boolean(b.isPrimary) !== Boolean(a.isPrimary)) return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary));
        return (a.order ?? 0) - (b.order ?? 0);
      })
      .map((row) => row.url);
  }
  return [];
}
