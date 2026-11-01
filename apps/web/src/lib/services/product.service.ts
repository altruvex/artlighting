import { prisma } from "@repo/database";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { sellableFrom, inventorySelect, productBulbSelect, productDiscountRates, type ProductFamily } from "@repo/catalog";
import { bulbChoices, type BulbChoice } from "@repo/catalog/bulb-pricing";
import { localizeSpecGroups, specGroupSelect, specNumbersByKey, specsByKey, type LocalizedSpecGroup } from "@/lib/spec-groups";
import { serializeMoney, serializeRate } from "@repo/money";
import { toViewConfiguration } from "@/lib/serialize-money";
import { CATALOGUE_TAG, catalogueCacheLife } from "@/lib/cache.server";
import { cacheTag } from "next/cache";

export interface ProductFilters {
  brand?: string;
  sectionType?: ProductFamily;
  spotlightType?: string;
  isActive?: boolean;
}

export interface LocalizedProductData {
  id: string;
  productId: string;
  productName: string;
  localizedName: string;
  localizedDescription?: string | null;
  brand: string;
  price: string;
  discount: string;
  priceIncrease: string;
  productImages: string[];
  images: string[];
  /** A downloadable datasheet, when one has been uploaded for this product. */
  specSheetUrl: string | null;
  specGroups: LocalizedSpecGroup[];
  sectionType: ProductFamily;
  spotlightType: string;
  /** Units a customer may buy; null when the product is not tracked (no limit). */
  quantity: number | null;
  /** The average of this product's reviews, or null with none yet. */
  ratingAverage: number | null;
  ratingCount: number;
  isActive: boolean;
  featured: boolean;
  maxIP: number | null;
  productColor: string | null;
  productIp: string | null;
  productChandLamp: string | null;
  hNumber: number | null;
  chandelierLightingType: string | null;
  categoryId: string | null;
  lightingtypeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  bulbChoices: BulbChoice[];
  maximumWattage?: number;
  mainMaterial?: string;
  beamAngle?: string;
  lampBase?: string;
  colorTemperature?: string;
  lifeTime?: string;
  finish?: string;
  input?: string;
  brandOfLed?: string;
  luminousFlux?: string;
  cri?: string;
  workingTemperature?: string;
  fixtureDimmable?: string;
  electrical?: string;
  powerFactor?: string;
  energySaving?: string;
  ip?: number;
  bulb?: string;
  category?: any;
  lightingtype?: any;
  translations?: any[];
}

export function transformToLocalizedProduct(
  product: any,
  language: string,
  /**
   * Effective rates from the pricing engine, keyed by product id. The
   * storefront's "13% off" used to come from `Product.discount`, a rate on
   * the row — which is why a promotion could not have a date window, a
   * minimum or a scope. Absent means no promotion applies to that product
   * right now, which is a real answer, not a missing one.
   */
  discountRates: Record<string, string> = {}
): LocalizedProductData {
  const translation = product.translations?.[0];
  const localizedGroups = localizeSpecGroups(product.specGroups ?? [], language);
  const specs = specsByKey(localizedGroups);
  const specNumbers = specNumbersByKey(localizedGroups);

  const localizedName = translation?.name || product.productName;

  return {
    id: product.id,
    productId: product.productId,
    productName: localizedName,
    localizedName,
    localizedDescription: translation?.description ?? null,
    brand: product.brand,
    // Money leaves the service as strings: a Prisma.Decimal cannot be passed
    // to a Client Component, and Number() would drop digits (see @repo/money).
    price: serializeMoney(product.price),
    discount: discountRates[product.id] ?? serializeRate(0),
    priceIncrease: serializeMoney(product.priceIncrease ?? 0),
    productImages: imageUrls(product),
    images: imageUrls(product),
    specSheetUrl: product.specSheetUrl ?? null,
    // Grouped, localized and already formatted — the page no longer builds
    // this table by hand with a label written out in each language.
    specGroups: localizedGroups,
    // Priced for this fixture's arms and named for this locale. Empty for
    // anything with no arms, which is the rule: the choice appears only
    // where a bulb goes.
    bulbChoices: bulbChoices(product.bulbs, product.hNumber, language),
    sectionType: product.sectionType,
    spotlightType: product.spotlightType,
    quantity: sellableFrom(product, product.variants?.[0]?.inventory),
    ratingAverage: product.ratingAverage !== null && product.ratingAverage !== undefined ? Number(product.ratingAverage) : null,
    ratingCount: product.ratingCount ?? 0,
    isActive: product.isActive ?? true,
    featured: product.featured ?? false,
    maxIP: product.maxIP ?? null,
    productColor: product.productColor ?? null,
    productIp: product.productIp ?? null,
    productChandLamp: product.productChandLamp ?? null,
    hNumber: product.hNumber ?? null,
    chandelierLightingType: product.chandelierLightingType ?? null,
    categoryId: product.categoryId ?? null,
    lightingtypeId: product.lightingtypeId ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    // The structured store is the only source. The legacy
    // ProductSpecification columns are no longer written by either app, and
    // had drifted per language before that — two products carry an Arabic
    // "٠" where the English row has the real figure.
    maximumWattage: specNumbers.maximumWattage,
    mainMaterial: specs.mainMaterial,
    beamAngle: specs.beamAngle,
    lampBase: specs.lampBase,
    colorTemperature: specs.colorTemperature,
    lifeTime: specs.lifeTime,
    finish: specs.finish,
    input: specs.input,
    brandOfLed: specs.brandOfLed,
    luminousFlux: specs.luminousFlux,
    cri: specs.cri,
    workingTemperature: specs.workingTemperature,
    fixtureDimmable: specs.fixtureDimmable,
    electrical: specs.electrical,
    powerFactor: specs.powerFactor,
    energySaving: specs.energySaving,
    ip: specNumbers.ip ?? product.maxIP ?? undefined,
    bulb: specs.bulb,
    category: product.category,
    lightingtype: product.lightingtype,
    translations: product.translations,
  };
}

function buildProductInclude(language: string, withRelations = false) {
  return {
    translations: { where: { language }, take: 1 },
    // The ProductImage table, not Product.productImages[] — see lib/product-images.
    images: productImageSelect(),
    // The structured specs; see lib/spec-groups.
    specGroups: specGroupSelect(language),
    // Which bulbs this fixture is sold with. Only fixtures with arms have
    // any; see @repo/catalog/bulb-pricing.
    bulbs: productBulbSelect(),
    // Always, not only for the detail page: a card's generated description
    // opens with the lighting type's name, and a listing that omits it
    // would open with a blank.
    lightingtype: { include: { translations: { where: { language }, take: 1 } } },
    // Stock lives in the inventory ledger. What the storefront needs is
    // what a customer can actually buy, which is on hand minus whatever is
    // already promised to unshipped orders.
    variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
    ...(withRelations && {
      category: {
        include: { translations: { where: { language }, take: 1 } },
      },
    }),
  };
}
async function cachedProductDetail(productId: string, language: string): Promise<LocalizedProductData | null> {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  await catalogueCacheLife();
  const raw = await prisma.product.findUnique({
    where: { productId },
    include: buildProductInclude(language, true),
  });
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
  ): Promise<LocalizedProductData | null> {
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
    product: LocalizedProductData,
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
        [{ id: product.id, price: product.price, categoryId: product.categoryId ?? "", lightingtypeId: product.lightingtypeId ?? "", sectionType: product.sectionType }],
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