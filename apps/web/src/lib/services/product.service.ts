import { prisma } from "@repo/database";
import type { Prisma } from "@repo/database";
import { CacheService, CacheTTL, CachePrefix } from "@/lib/cache/redis.service";

export interface ProductFilters {
  brand?: string;
  sectionType?: string;
  spotlightType?: string;
  categoryId?: string;
  lightingtypeId?: string;
  isActive?: boolean;
  featured?: boolean;
  searchQuery?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface ProductListResult<T> {
  products: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface LocalizedProductData {
  id: string;
  productId: string;
  productName: string;
  localizedName: string;
  localizedDescription?: string | null;
  brand: string;
  price: number;
  discount: number;
  priceIncrease: number;
  productImages: string[];
  images: string[];
  sectionType: string;
  spotlightType: string;
  quantity: number;
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
  specifications: LocalizedSpecsData | null;
  localizedSpecs: LocalizedSpecsData;
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

export interface LocalizedSpecsData {
  id?: string;
  productId?: string;
  language?: string;
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
  customSpecs?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export function transformToLocalizedProduct(
  product: any,
  language: string
): LocalizedProductData {
  const translation = product.translations?.[0];
  const specs: LocalizedSpecsData = product.specifications?.[0] ?? {};

  const localizedName = translation?.name || product.productName;

  return {
    id: product.id,
    productId: product.productId,
    productName: localizedName,
    localizedName,
    localizedDescription: translation?.description ?? null,
    brand: product.brand,
    price: product.price,
    discount: product.discount ?? 0,
    priceIncrease: product.priceIncrease ?? 0,
    productImages: product.productImages ?? [],
    images: product.productImages ?? [],
    sectionType: product.sectionType,
    spotlightType: product.spotlightType,
    quantity: product.quantity ?? 0,
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
    specifications: specs,
    localizedSpecs: specs,
    maximumWattage: specs.maximumWattage ? parseInt(specs.maximumWattage) : undefined,
    mainMaterial: specs.mainMaterial ?? undefined,
    beamAngle: specs.beamAngle ?? undefined,
    lampBase: specs.lampBase ?? undefined,
    colorTemperature: specs.colorTemperature ?? undefined,
    lifeTime: specs.lifeTime ?? undefined,
    finish: specs.finish ?? undefined,
    input: specs.input ?? undefined,
    brandOfLed: specs.brandOfLed ?? undefined,
    luminousFlux: specs.luminousFlux ?? undefined,
    cri: specs.cri ?? undefined,
    workingTemperature: specs.workingTemperature ?? undefined,
    fixtureDimmable: specs.fixtureDimmable ?? undefined,
    electrical: specs.electrical ?? undefined,
    powerFactor: specs.powerFactor ?? undefined,
    energySaving: specs.energySaving ?? undefined,
    ip: specs.ip ? parseInt(specs.ip) : (product.maxIP ?? undefined),
    bulb: specs.bulb ?? undefined,
    category: product.category,
    lightingtype: product.lightingtype,
    translations: product.translations,
  };
}

function buildProductInclude(language: string, withRelations = false) {
  return {
    translations: { where: { language }, take: 1 },
    specifications: { where: { language }, take: 1 },
    ...(withRelations && {
      category: {
        include: { translations: { where: { language }, take: 1 } },
      },
      lightingtype: {
        include: { translations: { where: { language }, take: 1 } },
      },
    }),
  };
}
export class ProductService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  static async getLocalizedProducts(
    filters: ProductFilters,
    language: string,
    pagination: PaginationParams = {},
    _options?: Record<string, boolean>
  ): Promise<ProductListResult<LocalizedProductData>> {
    const { page = 1, limit = this.DEFAULT_PAGE_SIZE, cursor } = pagination;
    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const skip = cursor ? undefined : (page - 1) * safeLimit;

    const cacheKey = `${CachePrefix.PRODUCTS_LIST}${JSON.stringify(filters)}:${language}:${page}:${safeLimit}`;
    const cached = await CacheService.get<ProductListResult<LocalizedProductData>>(cacheKey);
    if (cached) return cached;

    const where: Prisma.ProductWhereInput = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.sectionType && { sectionType: filters.sectionType }),
      ...(filters.spotlightType && { spotlightType: filters.spotlightType }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.lightingtypeId && { lightingtypeId: filters.lightingtypeId }),
      ...(filters.featured !== undefined && { featured: filters.featured }),
      ...(filters.searchQuery && {
        OR: [
          { productName: { contains: filters.searchQuery, mode: "insensitive" } },
          { brand: { contains: filters.searchQuery, mode: "insensitive" } },
          { sectionType: { contains: filters.searchQuery, mode: "insensitive" } },
        ],
      }),
    };

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: buildProductInclude(language),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip }),
        take: safeLimit + 1,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      }),
      prisma.product.count({ where }),
    ]);

    const hasMore = rawProducts.length > safeLimit;
    const sliced = hasMore ? rawProducts.slice(0, safeLimit) : rawProducts;
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

    const result: ProductListResult<LocalizedProductData> = {
      products: sliced.map((p) => transformToLocalizedProduct(p, language)),
      total,
      hasMore,
      nextCursor,
    };

    await CacheService.set(cacheKey, result, CacheTTL.FIVE_MINUTES);
    return result;
  }

  static async getLocalizedProductDetail(
    productId: string,
    language: string,
    filters?: Partial<Pick<ProductFilters, "brand" | "sectionType" | "spotlightType" | "isActive">>
  ): Promise<LocalizedProductData | null> {
    const cacheKey = `${CachePrefix.PRODUCT}detail:${productId}:${language}`;
    const cached = await CacheService.get<LocalizedProductData>(cacheKey);
    if (cached) return cached;

    const raw = await prisma.product.findUnique({
      where: {
        productId,
        ...(filters?.sectionType && { sectionType: filters.sectionType }),
        ...(filters?.spotlightType && { spotlightType: filters.spotlightType }),
        ...(filters?.brand && { brand: filters.brand }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: buildProductInclude(language, true),
    });

    if (!raw) return null;

    const product = transformToLocalizedProduct(raw, language);
    await CacheService.set(cacheKey, product, CacheTTL.FIFTEEN_MINUTES);
    return product;
  }

  static async getProductById(productId: string, language: string) {
    return this.getLocalizedProductDetail(productId, language);
  }

  static async getRelatedProducts(
    productId: string,
    brand: string,
    sectionType: string,
    language: string,
    opts: { spotlightType?: string; maxIP?: number; limit?: number } = {}
  ): Promise<LocalizedProductData[]> {
    const { spotlightType, maxIP, limit = 8 } = opts;
    const cacheKey = `${CachePrefix.PRODUCTS_LIST}related:${productId}:${language}`;
    const cached = await CacheService.get<LocalizedProductData[]>(cacheKey);
    if (cached) return cached;

    const raw = await prisma.product.findMany({
      where: {
        productId: { not: productId },
        brand,
        sectionType,
        isActive: true,
        ...(spotlightType || maxIP
          ? {
            OR: [
              ...(spotlightType ? [{ spotlightType }] : []),
              ...(maxIP
                ? [
                  {
                    maxIP: {
                      gte: Math.max(20, maxIP - 20),
                      lte: maxIP + 20,
                    },
                  },
                ]
                : []),
            ],
          }
          : {}),
      },
      include: buildProductInclude(language, true),
      take: limit,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    const products = raw.map((p) => transformToLocalizedProduct(p, language));
    await CacheService.set(cacheKey, products, CacheTTL.FIVE_MINUTES);
    return products;
  }

  /**
   * The signed-in customer's configuration for this product, created if
   * missing. Scoped by owner: it used to return the newest configuration for
   * the product regardless of who made it, so two customers shared one row
   * and each overwrote the other's quantity.
   */
  static async getOrCreateConfiguration(product: LocalizedProductData, userId?: string | null) {
    let config = await prisma.configuration.findFirst({
      where: { productId: product.productId, userId: userId ?? null },
      orderBy: { updatedAt: "desc" },
    });

    if (!config) {
      config = await prisma.configuration.create({
        data: {
          productId: product.productId,
          userId: userId ?? null,
          configPrice: product.price,
          priceIncrease: product.priceIncrease,
          shippingPrice: 69,
          discount: product.discount,
          quantity: 1,
          totalPrice: product.price,
          lampPriceIncrease: 0,
        },
      });
    }

    return {
      ...config,
      lampPriceIncrease: config.lampPriceIncrease ?? undefined,
      productIp: config.productIp ?? undefined,
      currency: config.currency as any,
    };
  }

  static async getFeaturedProducts(language: string, limit = 10) {
    const cacheKey = `${CachePrefix.PRODUCTS_LIST}featured:${language}:${limit}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const raw = await prisma.product.findMany({
      where: { featured: true, isActive: true },
      include: buildProductInclude(language),
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const products = raw.map((p) => transformToLocalizedProduct(p, language));
    await CacheService.set(cacheKey, products, CacheTTL.FIVE_MINUTES);
    return products;
  }

  static async getProductsByIds(productIds: string[], language: string) {
    const raw = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: buildProductInclude(language),
    });
    return raw.map((p) => transformToLocalizedProduct(p, language));
  }

  static async invalidateProductCache(productId?: string) {
    if (productId) {
      await CacheService.deletePattern(`${CachePrefix.PRODUCT}${productId}:*`);
    }
    await CacheService.deletePattern(`${CachePrefix.PRODUCTS_LIST}*`);
  }
}