import { Prisma, prisma } from "@repo/database";
import type { DatasheetProductData } from "@repo/datasheet";
import { resolveProductImages } from "./resolve-images";
import {
  buildDatasheetSections,
  composeDescription,
  resolveFamily,
  type DatasheetCustomSpecs,
} from "./build-sections";

const DATASHEET_PRODUCT_INCLUDE = {
  images: { orderBy: { order: "asc" as const } },
  category: true,
  lightingtype: true,
  translations: true,
  specifications: true,
} satisfies Prisma.ProductInclude;

export type ProductWithDatasheetRelations = Prisma.ProductGetPayload<{
  include: typeof DATASHEET_PRODUCT_INCLUDE;
}>;

/**
 * Maps a fetched product row into the datasheet's flat data shape,
 * including resolving its main image (a network fetch — see
 * resolve-images.ts). Shared by both the single-product path and the bulk
 * path so a product is described identically either way.
 */
export async function mapProductToDatasheetData(
  product: ProductWithDatasheetRelations,
  language: "en" | "ar" = "en"
): Promise<DatasheetProductData> {
  const translation = product.translations.find((t) => t.language === language);
  const spec = product.specifications.find((s) => s.language === language);
  // Fall back to the other language's spec row rather than rendering an empty
  // sheet: the technical values (IP, wattage, lumens) are language-neutral.
  const specFallback = spec ?? product.specifications[0];
  const customSpecs = (specFallback?.customSpecs ?? null) as DatasheetCustomSpecs | null;

  const family = resolveFamily(product.category.name);

  const sections = buildDatasheetSections({
    spec: specFallback,
    brand: product.brand,
    family,
    customSpecs,
  });

  // An authored description always wins; the composed one only fills the gap.
  const authored = translation?.description?.trim();
  const descriptionText = authored || composeDescription(specFallback, family);

  const { mainImage, dimensionDiagrams, brandLogos } = await resolveProductImages(product);

  return {
    productCode: product.productId.toUpperCase(),
    categoryLabel: `${product.lightingtype.name} — ${product.category.name}`,
    descriptionText,
    mainImage,
    dimensionDiagrams,
    brandLogos,
    sections,
  };
}

/** Single-product fetch + map — used by apps/admin's single-product download route. */
export async function getDatasheetProductData(
  productId: string,
  language: "en" | "ar" = "en"
): Promise<DatasheetProductData | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: DATASHEET_PRODUCT_INCLUDE,
  });
  if (!product) return null;
  return mapProductToDatasheetData(product, language);
}

/**
 * Bulk raw-row fetch — ONE findMany instead of N findUnique round trips.
 * Deliberately returns unmapped rows (no image resolution yet): the caller
 * (the worker's bulk job runner) maps each product one at a time inside its
 * own concurrency-limited loop, so N products don't all fire their image
 * fetches at once.
 */
export async function getDatasheetProductRows(
  productIds: string[]
): Promise<{ found: ProductWithDatasheetRelations[]; missingIds: string[] }> {
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: DATASHEET_PRODUCT_INCLUDE,
  });
  const foundIds = new Set(found.map((p) => p.id));
  const missingIds = productIds.filter((id) => !foundIds.has(id));
  return { found, missingIds };
}
