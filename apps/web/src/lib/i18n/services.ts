import type { LocalizedCategory, LocalizedProduct, SectionType, SupportedLanguage } from "@/types/products";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { availableFrom, inventorySelect, productDiscountRates, type ProductFamily } from "@repo/catalog";
import { serializeMoney, serializeRate } from "@repo/money";
import { prisma } from "@repo/database";
import { CacheService, CacheTTL } from "@/lib/cache/redis.service";

export class I18nService {
    private static instance: I18nService;

    static getInstance(): I18nService {
        if (!this.instance) {
            this.instance = new I18nService();
        }
        return this.instance;
    }

    private getCacheKey(entity: string, language: string, ...params: string[]): string {
        return `i18n:${entity}:${language}:${params.join('_')}`;
    }

    /**
     * Get localized categories for a specific brand
     */
    async getLocalizedCategories(
        brand: string,
        language: SupportedLanguage = "en"
    ): Promise<LocalizedCategory[]> {
        const cacheKey = this.getCacheKey("categories", language, brand);

        // Try Redis cache first
        const cached = await CacheService.get<LocalizedCategory[]>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const categoriesWithCounts = await prisma.product.groupBy({
                by: ["sectionType", "categoryId"],
                where: {
                    brand: brand,
                    isActive: true,
                },
                _count: {
                    _all: true,
                },
                orderBy: {
                    sectionType: "desc",
                },
            });
            const categoryIds = [...new Set(categoriesWithCounts.map(c => c.categoryId))];

            const categoriesWithTranslations = await prisma.category.findMany({
                where: {
                    id: { in: categoryIds },
                    isActive: true,
                },
                include: {
                    translations: {
                        where: {
                            language: language,
                        },
                    },
                },
            });
            const localizedCategories: LocalizedCategory[] = categoriesWithCounts.map(groupItem => {
                const categoryDetail = categoriesWithTranslations.find(c => c.id === groupItem.categoryId);
                const translation = categoryDetail?.translations[0];

                return {
                    id: groupItem.categoryId,
                    name: categoryDetail?.name || groupItem.sectionType,
                    slug: categoryDetail?.slug || groupItem.sectionType,
                    localizedName: translation?.name || categoryDetail?.name || groupItem.sectionType,
                    localizedSlug: translation?.slug || categoryDetail?.slug || groupItem.sectionType,
                    sectionType: groupItem.sectionType,
                    productCount: groupItem._count._all,
                    image: this.getSectionTypeImage(groupItem.sectionType as SectionType),
                };
            });

            // Cache in Redis with 5 minute TTL
            await CacheService.set(cacheKey, localizedCategories, CacheTTL.FIVE_MINUTES);

            return localizedCategories;
        } catch (error) {
            console.error(`Failed to get localized categories for ${brand}:`, error);
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get localized lighting types for a category
     */
    async getLocalizedLightingTypes(
        brand: string,
        sectionType: ProductFamily,
        language: SupportedLanguage = "en"
    ) {
        const cacheKey = this.getCacheKey("lightingTypes", language, brand, sectionType);

        // Try Redis cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const lightingTypesWithCounts = await prisma.product.groupBy({
                by: ["lightingtypeId", "spotlightType", "categoryId"],
                where: {
                    brand,
                    sectionType,
                    isActive: true,
                },
                _count: { _all: true },
            });

            const lightingTypeIds = [...new Set(lightingTypesWithCounts.map(lt => lt.lightingtypeId))];
            const categoryIds = [...new Set(lightingTypesWithCounts.map(lt => lt.categoryId))];
            const spotlightTypes = [...new Set(lightingTypesWithCounts.map(lt => lt.spotlightType))];

            const [lightingTypesWithTranslations, categoriesWithTranslations, firstProducts] = await Promise.all([
                // LightingType rows were folded into Category (as parentId-linked
                // children) — see packages/database/prisma/schema.prisma. Same
                // shape (id, name, slug, translations), so nothing else here changes.
                prisma.category.findMany({
                    where: { id: { in: lightingTypeIds }, isActive: true },
                    include: { translations: { where: { language } } },
                }),
                prisma.category.findMany({
                    where: { id: { in: categoryIds }, isActive: true },
                    include: { translations: { where: { language } } },
                }),
                prisma.product.findMany({
                    where: {
                        brand,
                        sectionType,
                        isActive: true,
                        spotlightType: { in: spotlightTypes },
                        images: { some: {} },
                    },
                    select: {
                        spotlightType: true,
                        images: productImageSelect(),
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                }),
            ]);

            const firstImageBySpotlightType = new Map<string, string | null>();
            for (const product of firstProducts) {
                if (!firstImageBySpotlightType.has(product.spotlightType)) {
                    firstImageBySpotlightType.set(
                        product.spotlightType,
                        imageUrls(product)[0] ?? null
                    );
                }
            }

            const localizedLightingTypes = lightingTypesWithCounts.map(groupItem => {
                const lightingTypeDetail = lightingTypesWithTranslations.find(lt => lt.id === groupItem.lightingtypeId);
                const translation = lightingTypeDetail?.translations[0];
                const categoryDetail = categoriesWithTranslations.find(c => c.id === groupItem.categoryId);
                const categoryTranslation = categoryDetail?.translations[0];
                const firstImage = firstImageBySpotlightType.get(groupItem.spotlightType) || null;

                return {
                    id: groupItem.lightingtypeId,
                    name: lightingTypeDetail?.name || groupItem.spotlightType,
                    slug: lightingTypeDetail?.slug || groupItem.spotlightType,
                    localizedName: translation?.name || lightingTypeDetail?.name || groupItem.spotlightType,
                    localizedSlug: translation?.slug || lightingTypeDetail?.slug || groupItem.spotlightType,
                    spotlightType: groupItem.spotlightType,
                    productCount: groupItem._count._all,
                    firstProductImage: firstImage,
                    localizedCategoryName: categoryTranslation?.name || categoryDetail?.name || "",
                };
            });

            await CacheService.set(cacheKey, localizedLightingTypes, CacheTTL.FIVE_MINUTES);

            return localizedLightingTypes;
        } catch (error) {
            console.error(`Failed to get localized lighting types:`, error);
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    /**
     * Get localized products
     */
    async getLocalizedProducts(
        filters: {
            brand?: string;
            sectionType?: ProductFamily;
            spotlightType?: string;
            categoryId?: string;
            lightingtypeId?: string;
        },
        language: SupportedLanguage = "en",
        pagination: { page: number; limit: number } = { page: 1, limit: 20 },
        options?: {
            includeSpecifications?: boolean;
            includeTranslations?: boolean;
            includeImages?: boolean;
        }
    ): Promise<{ products: LocalizedProduct[]; total: number; hasMore: boolean }> {
        const cacheKey = this.getCacheKey(
            "products",
            language,
            JSON.stringify(filters),
            `${pagination.page}_${pagination.limit}`,
            JSON.stringify(options || {})
        );

        // Try Redis cache first
        const cached = await CacheService.get<{ products: LocalizedProduct[]; total: number; hasMore: boolean }>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const where = {
                ...filters,
                isActive: true,
            };
            const includeFields = {
                translations: options?.includeTranslations !== false ? {
                    where: { language },
                } : false,
                specifications: options?.includeSpecifications !== false ? {
                    where: { language },
                } : false,
                // The ProductImage table, not Product.productImages[] — see
                // lib/product-images.
                images: productImageSelect(),
                // What a customer can buy: on hand minus what is promised.
                variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
            };

            // OPTIMIZED: Parallel queries
            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where,
                    include: includeFields,
                    skip: (pagination.page - 1) * pagination.limit,
                    take: pagination.limit,
                    orderBy: [
                        { featured: 'desc' },
                        { createdAt: 'desc' },
                    ],
                }),
                prisma.product.count({ where }),
            ]);

            const rates = await productDiscountRates(products, prisma);
            const localizedProducts: LocalizedProduct[] = products.map(product => {
                const primarySpec = product.specifications?.[0];
                const primaryTranslation = product.translations?.[0];

                return {
                    id: product.id,
                    productId: product.productId,
                    productName: product.productName,
                    localizedName: primaryTranslation?.name || product.productName,
                    localizedDescription: primaryTranslation?.description ?? undefined,
                    brand: product.brand,
                    price: serializeMoney(product.price),
                    // From the engine, not from a rate on the row.
                    discount: rates[product.id] ?? serializeRate(0),
                    priceIncrease: serializeMoney(product.priceIncrease ?? 0),
                    quantity: availableFrom(product.variants?.[0]?.inventory),
                    images: imageUrls(product),
                    productImages: imageUrls(product),
                    sectionType: product.sectionType,
                    spotlightType: product.spotlightType,
                    categoryId: product.categoryId,
                    lightingtypeId: product.lightingtypeId,
                    maxIP: product.maxIP ?? undefined,
                    hNumber: product.hNumber ?? undefined,
                    chandelierLightingType: product.chandelierLightingType ?? undefined,
                    productColor: product.productColor ?? undefined,
                    productIp: product.productIp ?? undefined,
                    productChandLamp: product.productChandLamp ?? undefined,
                    isActive: product.isActive,
                    featured: product.featured,
                    specifications: primarySpec ? {
                        language: primarySpec.language,
                        maximumWattage: primarySpec.maximumWattage ?? undefined,
                        mainMaterial: primarySpec.mainMaterial ?? undefined,
                        beamAngle: primarySpec.beamAngle ?? undefined,
                        lampBase: primarySpec.lampBase ?? undefined,
                        input: primarySpec.input ?? undefined,
                        brandOfLed: primarySpec.brandOfLed ?? undefined,
                        luminousFlux: primarySpec.luminousFlux ?? undefined,
                        cri: primarySpec.cri ?? undefined,
                        workingTemperature: primarySpec.workingTemperature ?? undefined,
                        fixtureDimmable: primarySpec.fixtureDimmable ?? undefined,
                        electrical: primarySpec.electrical ?? undefined,
                        powerFactor: primarySpec.powerFactor ?? undefined,
                        colorTemperature: primarySpec.colorTemperature ?? undefined,
                        ip: primarySpec.ip ?? undefined,
                        energySaving: primarySpec.energySaving ?? undefined,
                        lifeTime: primarySpec.lifeTime ?? undefined,
                        finish: primarySpec.finish ?? undefined,
                        bulb: primarySpec.bulb ?? undefined,
                        customSpecs: primarySpec.customSpecs ?? undefined,
                    } : undefined,
                    specificationsArray: product.specifications || [],
                    translations: product.translations || [],
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                    maximumWattage: primarySpec?.maximumWattage ?? undefined,
                    mainMaterial: primarySpec?.mainMaterial ?? undefined,
                    beamAngle: primarySpec?.beamAngle ?? undefined,
                    lampBase: primarySpec?.lampBase ?? undefined,
                    colorTemperature: primarySpec?.colorTemperature ?? undefined,
                    lifeTime: primarySpec?.lifeTime ?? undefined,
                    finish: primarySpec?.finish ?? undefined,
                    input: primarySpec?.input ?? undefined,
                };
            });

            const result = {
                products: localizedProducts,
                total,
                hasMore: pagination.page * pagination.limit < total,
            };

            // Cache in Redis
            await CacheService.set(cacheKey, result, CacheTTL.FIVE_MINUTES);

            return result;
        } catch (error) {
            console.error(`Failed to get localized products:`, error);
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get single localized product with full details
     */
    async getLocalizedProduct(
        productId: string,
        language: SupportedLanguage = "en"
    ): Promise<LocalizedProduct | null> {
        const cacheKey = this.getCacheKey("product", language, productId);

        // Try Redis cache first
        const cached = await CacheService.get<LocalizedProduct>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const product = await prisma.product.findUnique({
                where: { productId },
                include: {
                    translations: {
                        where: { language },
                    },
                    specifications: {
                        where: { language },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { language },
                            },
                        },
                    },
                    lightingtype: {
                        include: {
                            translations: {
                                where: { language },
                            },
                        },
                    },
                    images: productImageSelect(),
                    variants: { where: { isDefault: true }, select: { inventory: inventorySelect() }, take: 1 },
                },
            });

            if (!product) return null;

            const rates = await productDiscountRates([product], prisma);
            const localizedProduct: LocalizedProduct = {
                id: product.id,
                productId: product.productId,
                productName: product.productName,
                localizedName: product.translations[0]?.name || product.productName,
                brand: product.brand,
                price: serializeMoney(product.price),
                discount: rates[product.id] ?? serializeRate(0),
                images: imageUrls(product),
                specifications: product.specifications[0]
                    ? {
                        language: product.specifications[0].language,
                        ...this.formatSpecifications(product.specifications[0])
                    }
                    : undefined,
                quantity: availableFrom(product.variants?.[0]?.inventory),
                maxIP: product.maxIP || undefined,
                spotlightType: product.spotlightType,
                sectionType: product.sectionType,
            };

            // Cache in Redis
            await CacheService.set(cacheKey, localizedProduct, CacheTTL.FIVE_MINUTES);

            return localizedProduct;
        } catch (error) {
            console.error(`Failed to get localized product ${productId}:`, error);
            return null;
        }
    }

    private formatSpecifications(specifications: Record<string, unknown>): Record<string, string> {
        const formatted: Record<string, string> = {};

        const fields = [
            'input', 'maximumWattage', 'brandOfLed', 'luminousFlux',
            'mainMaterial', 'cri', 'beamAngle', 'workingTemperature',
            'fixtureDimmable', 'electrical', 'powerFactor', 'colorTemperature',
            'ip', 'energySaving', 'lifeTime', 'finish', 'lampBase', 'bulb'
        ];

        fields.forEach(field => {
            if (specifications[field]) {
                formatted[field] = specifications[field] as string;
            }
        });

        // Add custom specifications if they exist
        if (specifications.customSpecs) {
            Object.assign(formatted, specifications.customSpecs);
        }

        return formatted;
    }

    private getSectionTypeImage(sectionType: SectionType): string {
        const sectionTypeImages: Record<SectionType, string> = {
            indoor: "/indoor/products500/jy-539-7w/JY-539-7W (1).png",
            outdoor: "/new-collection/new-collection-2.jpg",
            chandelier: "/chandelier/MC15W/MC15W009.jpg",
        };

        return sectionTypeImages[sectionType] || "/brand/balcom.png";
    }

    /**
     * Clear all cached translations (invalidate Redis cache)
     */
    async clearCache(): Promise<void> {
        await CacheService.deletePattern("i18n:*");
    }

    /**
     * Clear cache for specific language
     */
    async clearLanguageCache(language: SupportedLanguage): Promise<void> {
        await CacheService.deletePattern(`i18n:*:${language}:*`);
    }
}