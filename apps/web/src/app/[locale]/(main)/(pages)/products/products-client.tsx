"use client";

import { Container } from "@/components/container";
import type { MoneyInput } from "@repo/money";
import ProductCard from "@/components/product-card/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  price: MoneyInput;
  productImages: string[];
  sectionType: string;
  spotlightType: string;
  discount: MoneyInput;
  chandelierLightingType?: string;
  hNumber?: number;
  maxIP?: number;
  quantity: number;
  isActive: boolean;
  featured: boolean;
  priceIncrease?: MoneyInput;
  maximumWattage?: string;
  lampBase?: string;
  mainMaterial?: string;
  beamAngle?: string;
  specifications?: Array<{
    language: string;
    maximumWattage?: string;
    mainMaterial?: string;
    beamAngle?: string;
    lampBase?: string;
    input?: string;
    brandOfLed?: string;
    luminousFlux?: string;
    cri?: string;
    workingTemperature?: string;
    fixtureDimmable?: string;
    electrical?: string;
    powerFactor?: string;
    colorTemperature?: string;
    ip?: string;
    energySaving?: string;
    lifeTime?: string;
    finish?: string;
    bulb?: string;
    customSpecs?: Record<string, any>;
  }>;
  translations?: Array<{
    language: string;
    name?: string;
    description?: string;
  }> | {
    name?: string;
    description?: string;
  };
  productColor?: 'warm' | 'cool' | 'white';
  productIp?: 'IP20' | 'IP44' | 'IP54' | 'IP65' | 'IP68';
  productChandLamp?: 'lamp9w' | 'lamp12w';
  categoryId?: string;
  lightingtypeId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductsClientProps {
  products: Product[];
  locale?: string;
}

type ProductCardProduct = Omit<Product, 'translations' | 'specifications'> & {
  translations?: {
    name?: string;
    description?: string;
  };
  specifications?: Array<{
    maximumWattage?: string;
    mainMaterial?: string;
    beamAngle?: string;
    lampBase?: string;
  }>;
};

const getLocaleAwareStyles = (locale: string) => {
  const isRTL = locale === 'ar';

  return {
    carouselContent: cn(
      "pl-4",
      isRTL && "pr-6 pl-0"
    ),
    carouselItem: cn(
      "pl-6 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 m-0",
      isRTL && "pr-6 pl-0"
    ),
    carouselPrevious: cn(
      "h-10 w-10 bg-slate-50 text-gray-950",
      isRTL ? "mr-6" : "ml-6"
    ),
    carouselNext: cn(
      "h-10 w-10 bg-slate-50 text-gray-950",
      isRTL ? "ml-6" : "mr-6"
    ),
    direction: isRTL ? 'rtl' : 'ltr'
  };
};


const analyzeProductData = (products: Product[], locale: string) => {
  if (products.length === 0) {
    console.log('[ProductsClient] No products available for analysis');
    return;
  }

  const sampleProduct = products[0];
  console.log('[ProductsClient] Product Analysis Report:', {
    locale,
    totalProducts: products.length,
    sampleProductId: sampleProduct.productId,
    hNumberStatus: {
      exists: sampleProduct.hNumber !== undefined,
      value: sampleProduct.hNumber,
      calculatedWattage: sampleProduct.hNumber ? sampleProduct.hNumber * 12 : null
    },
    dataIntegrity: {
      hasSpecifications: !!sampleProduct.specifications,
      hasTranslations: !!sampleProduct.translations,
      isActive: sampleProduct.isActive,
      isFeatured: sampleProduct.featured
    }
  });
};

const HydrationSafeCarousel = ({
  products,
  styles,
  locale
}: {
  products: ProductCardProduct[],
  styles: ReturnType<typeof getLocaleAwareStyles>,
  locale: string
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.slice(0, 5).map((product) => (
          <div key={product.productId} className="w-full">
            <ProductCard product={product} locale={locale} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent className={styles.carouselContent}>
        {products.map((product) => (
          <CarouselItem key={product.productId} className={styles.carouselItem}>
            <ProductCard product={product} locale={locale} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className={styles.carouselPrevious} />
      <CarouselNext className={styles.carouselNext} />
    </Carousel>
  );
};

export default function ProductsClient({ products, locale: propLocale = 'ar' }: ProductsClientProps) {
  const [isClicked, setIsClicked] = useState(false);

  const currentLocale = propLocale;

  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations("products-client");

  const localeStyles = getLocaleAwareStyles(currentLocale);

  useEffect(() => {
    if (products.length > 0) {
      analyzeProductData(products, currentLocale);
    }
  }, [products, currentLocale]);

  const handleClickedButtons = () => {
    setIsClicked(true);
  };

  const transformProductData = (product: Product): ProductCardProduct => {
    let normalizedTranslations: { name?: string; description?: string } | undefined;

    if (product.translations) {
      if (Array.isArray(product.translations)) {
        // Find translation for current locale, or use first one as fallback
        const localeTranslation = product.translations.find(t => t.language === currentLocale)
          || product.translations[0];
        normalizedTranslations = {
          name: localeTranslation?.name,
          description: localeTranslation?.description
        };
      } else {
        // Already in the correct format
        normalizedTranslations = {
          name: product.translations.name,
          description: product.translations.description
        };
      }
    }

    // Transform specifications to match ProductCard format
    const normalizedSpecifications = product.specifications?.map(spec => ({
      maximumWattage: spec.maximumWattage,
      mainMaterial: spec.mainMaterial,
      beamAngle: spec.beamAngle,
      lampBase: spec.lampBase,
    }));

    return {
      ...product,
      translations: normalizedTranslations,
      specifications: normalizedSpecifications,
      hNumber: product.hNumber ?? undefined,
      quantity: product.quantity ?? 0,
      isActive: product.isActive ?? true,
      featured: product.featured ?? false,
      priceIncrease: product.priceIncrease ?? 0,
    };
  };

  return (
    <section
      className="py-12 md:py-14 lg:py-16"
      dir={localeStyles.direction}
    >
      <Container>
        <div className="mb-10 md:mb-12 text-center">
          <h2 className="font-bold text-2xl md:text-3xl tracking-tight mb-2">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="flex items-center justify-center flex-col">
            <HydrationSafeCarousel
              products={products.map(transformProductData)}
              styles={localeStyles}
              locale={currentLocale}
            />
            <div className="flex items-center justify-center mt-10">
              <Link
                className={cn(
                  "flex items-center justify-center transition-colors border-[1.5px] font-medium h-14 md:px-10 px-7 md:text-lg text-sm w-full rounded",
                  "bg-background text-foreground border-border hover:bg-gray-950 hover:text-muted hover:border-gray-950",
                  "dark:bg-background dark:text-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground",
                  {
                    "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground border-gray-950":
                      isClicked,
                  }
                )}
                href="/category"
                onClick={handleClickedButtons}
              >
                {t("exploreAllProducts")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {t("noProducts")}
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}