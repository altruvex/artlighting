import { prisma, type Prisma } from "@repo/database";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { sellableFrom, inventorySelect, productBulbSelect, productDiscountRates, type ProductFamily } from "@repo/catalog";
import { bulbChoices, type BulbChoice } from "@repo/catalog/bulb-pricing";
import { localizeSpecGroups, specGroupSelect, type LocalizedSpecGroup } from "@/lib/spec-groups";
import { serializeMoney, serializeRate } from "@repo/money";
import { toViewConfiguration } from "@/lib/serialize-money";
import { CATALOGUE_TAG, catalogueCacheLife, productTag } from "@/lib/cache.server";
import { cacheTag } from "next/cache";

export interface ProductFilters {
  brand?: string;
  sectionType?: ProductFamily;
  spotlightType?: string;
  isActive?: boolean;
}

/**
 * The product as the page's client tree renders it — and nothing else, since
 * every field here is serialized into the page for the browser. The record
 * used to carry the raw translations, the category and lighting-type rows,
 * the images twice and 17 flat spec fields that repeat `specGroups`.
 */
export interface LocalizedProductData {
  productId: string;
  productName: string;
  brand: string;
  price: string;
  discount: string;
  productImages: string[];
  specGroups: LocalizedSpecGroup[];
  bulbChoices: BulbChoice[];
  sectionType: ProductFamily;
  /** Units a customer may buy; null when the product is not tracked (no limit). */
  quantity: number | null;
  /** The average of this product's reviews, or null with none yet. */
  ratingAverage: number | null;
  ratingCount: number;
  maxIP: number | null;
  productColor: string | null;
  productIp: string | null;
  hNumber: number | null;
  /** Only its names: the page shows the localized one, the row's as fallback. */
  lightingtype: { name: string; translations: { name: string }[] } | null;
}

/** The cached record: what the client renders plus what only the server reads. */
export interface ProductDetailRecord extends LocalizedProductData {
  id: string;
  spotlightType: string;
  isActive: boolean;
  priceIncrease: string;
  categoryId: string;
  lightingtypeId: string;
  /** A downloadable datasheet, when one has been uploaded for this product. */
  specSheetUrl: string | null;
}

/** The client's share of a record, so the server-only fields stay on the server. */
export function productView(product: ProductDetailRecord): LocalizedProductData {
  return {
    productId: product.productId,
    productName: product.productName,
    brand: product.brand,
    price: product.price,
    discount: product.discount,
    productImages: product.productImages,
    specGroups: product.specGroups,
    bulbChoices: product.bulbChoices,
    sectionType: product.sectionType,
    quantity: product.quantity,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    maxIP: product.maxIP,
    productColor: product.productColor,
    productIp: product.productIp,
    hNumber: product.hNumber,
    lightingtype: product.lightingtype,
  };
}

/** Only the columns the record is built from. */
function productDetailSelect(language: string) {
  return {
    id: true,
    productId: true,
    productName: true,
    brand: true,
    price: true,
    priceIncrease: true,
    specSheetUrl: true,
    sectionType: true,
    spotlightType: true,
    trackInventory: true,
    ratingAverage: true,
    ratingCount: true,
    isActive: true,
    maxIP: true,
    productColor: true,
    productIp: true,
    hNumber: true,
    categoryId: true,
    lightingtypeId: true,
    translations: { where: { language }, take: 1, select: { name: true } },
    // The ProductImage table, not Product.productImages[] — see lib/product-images.
    images: productImageSelect(),
    // The structured specs; see lib/spec-groups.
    specGroups: specGroupSelect(language),
    // Which bulbs this fixture is sold with. Only fixtures with arms have
    // any; see @repo/catalog/bulb-pricing.
    bulbs: productBulbSelect(),
    // The page names the lighting type, in this locale where it can.
    lightingtype: { select: { name: true, translations: { where: { language }, take: 1, select: { name: true } } } },
    // Stock lives in the inventory ledger. What the storefront needs is
    // what a customer can actually buy, which is on hand minus whatever is
    // already promised to unshipped orders.
    variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
  } satisfies Prisma.ProductSelect;
}

function loadProductDetail(productId: string, language: string) {
  return prisma.product.findUnique({ where: { productId }, select: productDetailSelect(language) });
}

type ProductDetailRow = NonNullable<Awaited<ReturnType<typeof loadProductDetail>>>;

export function transformToLocalizedProduct(
  product: ProductDetailRow,
  language: string,
  /**
   * Effective rates from the pricing engine, keyed by product id. The
   * storefront's "13% off" used to come from `Product.discount`, a rate on
   * the row — which is why a promotion could not have a date window, a
   * minimum or a scope. Absent means no promotion applies to that product
   * right now, which is a real answer, not a missing one.
   */
  discountRates: Record<string, string> = {}
): ProductDetailRecord {
  return {
    id: product.id,
    productId: product.productId,
    productName: product.translations[0]?.name || product.productName,
    brand: product.brand,
    // Money leaves the service as strings: a Prisma.Decimal cannot be passed
    // to a Client Component, and Number() would drop digits (see @repo/money).
    price: serializeMoney(product.price),
    discount: discountRates[product.id] ?? serializeRate(0),
    priceIncrease: serializeMoney(product.priceIncrease ?? 0),
    productImages: imageUrls(product),
    specSheetUrl: product.specSheetUrl ?? null,
    // Grouped, localized and already formatted — the page no longer builds
    // this table by hand with a label written out in each language. The
    // structured store is the only source of specs: the legacy
    // ProductSpecification columns are no longer written by either app.
    specGroups: localizeSpecGroups(product.specGroups ?? [], language),
    // Priced for this fixture's arms and named for this locale. Empty for
    // anything with no arms, which is the rule: the choice appears only
    // where a bulb goes.
    bulbChoices: bulbChoices(product.bulbs, product.hNumber, language),
    sectionType: product.sectionType,
    spotlightType: product.spotlightType,
    quantity: sellableFrom(product, product.variants[0]?.inventory),
    ratingAverage: product.ratingAverage !== null && product.ratingAverage !== undefined ? Number(product.ratingAverage) : null,
    ratingCount: product.ratingCount ?? 0,
    isActive: product.isActive ?? true,
    maxIP: product.maxIP ?? null,
    productColor: product.productColor ?? null,
    productIp: product.productIp ?? null,
    hNumber: product.hNumber ?? null,
    categoryId: product.categoryId,
    lightingtypeId: product.lightingtypeId,
    lightingtype: product.lightingtype ?? null,
  };
}

async function cachedProductDetail(productId: string, language: string): Promise<ProductDetailRecord | null> {
  "use cache";
  // Its own tag as well, so an order or a review refreshes this product
  // without dropping every other page built from the catalogue.
  cacheTag(CATALOGUE_TAG, productTag(productId));
  await catalogueCacheLife();
  const raw = await loadProductDetail(productId, language);
  if (!raw) return null;
  const rates = await productDiscountRates([raw], prisma);
  return transformToLocalizedProduct(raw, language, rates);
}

export class ProductService {
  /**
   * One product as its page renders it, or null when it does not exist or
   * does not match the filters.
   *
   * The row itself is cached (`"use cache"`, per product and locale) and
   * the filters are checked against it afterwards. The Redis entry this
   * replaces was keyed without the filters, so whichever call filled it
   * answered for all of them: the metadata's unfiltered read made an
   * inactive product render, and a product was reachable under the other
   * brand's URL. It also cost a network round trip on every hit, and
   * nothing ever invalidated it.
   */
  static async getLocalizedProductDetail(
    productId: string,
    language: string,
    filters?: ProductFilters
  ): Promise<ProductDetailRecord | null> {
    const product = await cachedProductDetail(productId, language);
    if (!product) return null;
    if (filters?.sectionType && product.sectionType !== filters.sectionType) return null;
    if (filters?.spotlightType && product.spotlightType !== filters.spotlightType) return null;
    if (filters?.brand && product.brand !== filters.brand) return null;
    if (filters?.isActive !== undefined && product.isActive !== filters.isActive) return null;
    return product;
  }

  /**
   * The signed-in customer's configuration for this product, created if
   * missing. Scoped by owner: it used to return the newest configuration for
   * the product regardless of who made it, so two customers shared one row
   * and each overwrote the other's quantity.
   */
  static async getOrCreateConfiguration(
    product: ProductDetailRecord,
    userId?: string | null,
    guestToken?: string | null,
  ) {
    let config = await prisma.configuration.findFirst({
      where: userId
        ? { productId: product.productId, userId }
        : { productId: product.productId, userId: null, guestToken: guestToken ?? null },
      orderBy: { updatedAt: "desc" },
    });

    if (!config) {
      const rates = await productDiscountRates(
        [{ id: product.id, price: product.price, categoryId: product.categoryId, lightingtypeId: product.lightingtypeId, sectionType: product.sectionType }],
        prisma,
      );
      config = await prisma.configuration.create({
        data: {
          productId: product.productId,
          userId: userId ?? null,
          guestToken: userId ? null : (guestToken ?? null),
          configPrice: serializeMoney(product.price),
          priceIncrease: serializeMoney(product.priceIncrease),
          shippingPrice: 69,
          // The rate the engine gives right now, snapshotted onto the
          // configuration — not a rate read off the product row.
          discount: rates[product.id] ?? serializeRate(0),
          quantity: 1,
          totalPrice: serializeMoney(product.price),
          lampPriceIncrease: 0,
        },
      });
    }

    return toViewConfiguration(config);
  }
}