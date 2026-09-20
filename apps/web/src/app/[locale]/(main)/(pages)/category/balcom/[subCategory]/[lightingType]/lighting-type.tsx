"use client"
import { Container } from "@/components/container"
import { serializeMoney, serializeRate } from "@repo/money";
import ProductCard from "@/components/product-card/product-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LocalizedProduct, SupportedLanguage } from "@/types/products"
import { motion } from "framer-motion"
import { useState } from "react"

interface LightingTypeProps {
  products: LocalizedProduct[]
  subCategory: string
  lightingType: string
  locale: SupportedLanguage
  total: number
  hasMore: boolean
}

const transformProductForCard = (product: LocalizedProduct, locale: SupportedLanguage) => {

  const transformedProduct = {
    id: product.id,
    productId: product.productId,
    productName: product.localizedName || product.productName,
    brand: product.brand,
    price: product.price,
    discount: serializeRate(product.discount ?? 0),
    priceIncrease: serializeMoney(product.priceIncrease ?? 0),
    productImages: product.images || product.productImages || [],
    sectionType: product.sectionType,
    spotlightType: product.spotlightType,
    hNumber: product.hNumber,
    chandelierLightingType: product.chandelierLightingType,
    // The card's description is generated from these; see
    // @repo/catalog/describe. The invented fallbacks below feed only the
    // legacy spec shape the card no longer reads for its prose.
    specGroups: product.specGroups,
    lightingTypeName: product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? undefined,
    bulbChoices: product.bulbChoices ?? [],
    specifications: product.specifications ? [product.specifications] : [{
      language: locale,
      maximumWattage: product.maximumWattage ||
        (product.hNumber ? String(product.hNumber * 12) : "غير محدد"),
      mainMaterial: product.mainMaterial || "معدن عالي الجودة",
      beamAngle: product.beamAngle || "متغير",
      lampBase: product.lampBase || "قاعدة ليد",
      colorTemperature: product.colorTemperature || "3000K-6500K",
      lifeTime: product.lifeTime || "50000 ساعة",
      finish: product.finish || "أنيق",
      input: product.input || "AC 220V",
    }],

    translations: (() => {
      const fallback = {
        name: product.localizedName || product.productName,
        description: product.localizedDescription,
      };
      if (Array.isArray(product.translations) && product.translations.length > 0) {
        const [firstTranslation] = product.translations;
        return {
          name: firstTranslation?.name || fallback.name,
          description: firstTranslation?.description || fallback.description,
        };
      }
      return fallback;
    })(),
    quantity: product.quantity || 0,
    isActive: product.isActive ?? true,
    featured: product.featured ?? false,
    maxIP: product.maxIP,
    productColor: product.productColor,
    productIp: product.productIp,
    productChandLamp: product.productChandLamp,
    categoryId: product.categoryId,
    lightingtypeId: product.lightingtypeId,
    maximumWattage: product.maximumWattage,
    mainMaterial: product.mainMaterial,
    beamAngle: product.beamAngle,
    lampBase: product.lampBase,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
  return transformedProduct;
}

export default function LightingType({
  products,
  subCategory,
  lightingType,
  locale,
  total,
  hasMore,
}: LightingTypeProps) {
  const [displayedProducts, setDisplayedProducts] = useState(products)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, delay: 0.3 } },
  }

  const isRTL = locale === "ar"
  const displayName = lightingType

  const labels = {
    en: {
      title: `Baclom - ${displayName}`,
      productsFound: `${total} products`,
      loadMore: "Load More Products",
      loading: "Loading...",
      noProducts: "No products found",
      noProductsDesc: "Try searching for a different category or check back later",
    },
    ar: {
      title: `بالكوم - ${displayName}`,
      productsFound: `${total} منتج`,
      loadMore: "تحميل المزيد من المنتجات",
      loading: "جاري التحميل...",
      noProducts: "لم يتم العثور على منتجات",
      noProductsDesc: "جرب البحث عن فئة مختلفة أو تحقق مرة أخرى لاحقاً",
    },
  }

  const currentLabels = labels[locale]

  const loadMoreProducts = async () => {
    if (!hasMore || loading) return
    setLoading(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(
        `/api/products?page=${nextPage}&limit=20&brand=mister-led&sectionType=${subCategory}&spotlightType=${lightingType}&locale=${locale}`,
      )
      if (response.ok) {
        const data = await response.json()
        setDisplayedProducts(prev => [...prev, ...data.products])
        setCurrentPage(nextPage)
      }
    } catch (error) {
      console.error("Failed to load more products:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <Container>
        <motion.div className="py-16" initial="hidden" animate="visible" variants={variants}>
          <div className={cn("mb-12", isRTL ? "text-right" : "text-left")}>
            <Badge className="text-base rounded-xl">{currentLabels.productsFound}</Badge>
            <h1 className="md:text-3xl sm:text-2xl text-xl text-foreground mb-4">{currentLabels.title}</h1>
          </div>
          {displayedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-12">
                {displayedProducts.map((product, index) => {
                  const transformedProduct = transformProductForCard(product, locale);
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                    >
                      <ProductCard
                        product={transformedProduct}
                        locale={locale}
                      />
                    </motion.div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMoreProducts}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {currentLabels.loading}
                      </>
                    ) : (
                      currentLabels.loadMore
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-foreground/80 mb-2">{currentLabels.noProducts}</h3>
              <p className="text-muted-foreground">{currentLabels.noProductsDesc}</p>
            </div>
          )}
        </motion.div>
      </Container>
    </div>
  )
}