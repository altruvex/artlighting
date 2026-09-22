import type { LocalizedCategory, SectionType, SupportedLanguage } from "@/types/products";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import type { ProductFamily } from "@repo/catalog";
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