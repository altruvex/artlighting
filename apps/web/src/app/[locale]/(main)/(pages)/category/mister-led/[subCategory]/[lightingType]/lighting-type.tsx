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
    specifications: product.specifications ? [product.specifications] : [{
      language: locale,
      maximumWattage: product.maximumWattage ||
        (product.hNumber ? String(product.hNumber * 12) : "غير محدد"),
      mainMaterial: product.mainMaterial || "معدن عالي الجودة",
      beamAngle: product.beamAngle || "متغير",
      lampBase: product.lampBase || "قاعدة LED",
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
}: LightingTypeProps) {
  const [displayedProducts, setDisplayedProducts] = useState(products)

  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, delay: 0.3 } },
  }

  const isRTL = locale === "ar"
  const displayName = lightingType

  const labels = {
    en: {
      title: `Mister led - ${displayName}`,
      productsFound: `${total} products`,
      loadMore: "Load More Products",
      loading: "Loading...",
      noProducts: "No products found",
      noProductsDesc: "Try searching for a different category or check back later",
    },
    ar: {
      title: `مستر ليد - ${displayName}`,
      productsFound: `${total} منتج`,
      loadMore: "تحميل المزيد من المنتجات",
      loading: "جاري التحميل...",
      noProducts: "لم يتم العثور على منتجات",
      noProductsDesc: "جرب البحث عن فئة مختلفة أو تحقق مرة أخرى لاحقاً",
    },
  }

  const currentLabels = labels[locale]

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