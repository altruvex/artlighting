import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import LightingType from "./lighting-type";

export default async function Page({ params }: PagePropsTypes) {
  const { locale: localeParam, subCategory, lightingType } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  const t = await getTranslations('error')
  if (!subCategory || !lightingType) {
    notFound();
  }
  // The URL segment is a slug, not the stored value. Parsing it here means
  // an unknown section 404s instead of querying for something that cannot
  // exist — which is what the old string column quietly allowed.
  const family = familyFromSlug(subCategory);
  if (!family) notFound();
  try {
    const lightingTypes = await service.getLocalizedLightingTypes("mister-led", family, locale) as any[];

    const currentLightingType = lightingTypes.find(
      (lt: any) => lt.slug === lightingType || lt.localizedSlug === lightingType || lt.spotlightType === lightingType
    );

    if (!currentLightingType) {
      console.warn(`Lighting type not found: ${lightingType} in ${subCategory}`);
      notFound();
    }
    const { products, total } = await service.getLocalizedProducts(
      {
        brand: "mister-led",
        sectionType: family,
        spotlightType: currentLightingType.spotlightType,
      },
      locale,
      {
        page: 1,
        limit: 50,
      },
      {
        includeSpecifications: true,
        includeTranslations: true,
        includeImages: true
      }
    );
    const productsWithHNumber = products.filter(p => p.hNumber !== undefined && p.hNumber !== null);
    const productsWithChandelierType = products.filter(p => p.chandelierLightingType);

    console.log('[Page] Data validation:', {
      totalProducts: products.length,
      productsWithHNumber: productsWithHNumber.length,
      productsWithChandelierType: productsWithChandelierType.length,
      allProductsHaveSpecifications: products.every(p => p.specifications || (p.specificationsArray && p.specificationsArray.length > 0)),
    });

    const displayName = currentLightingType.localizedName;
    return (
      <>
        <Breadcrumb />
        <LightingType
          products={products}
          subCategory={subCategory}
          lightingType={displayName}
          locale={locale}
          total={total} hasMore={false}
        />
      </>
    );
  } catch (error) {
    console.error(`[Page] Failed to load products for ${subCategory}/${lightingType}:`, error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground/90 mb-4">
            {t('title')}
          </h2>
          <p className="text-muted-foreground">
            {t('message')}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {error instanceof Error ? error.message : t('unknown_error')}
          </p>
        </div>
      </div>
    );
  }
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const { subCategory, lightingType, locale: localeParam } = await params;
  const locale = getLocaleFromParams(await params);
  if (!subCategory || !lightingType) {
    notFound();
  }
  const titles = {
    en: `Mister led ${subCategory} - ${lightingType}`,
    ar: `مستر ليد ${subCategory} - ${lightingType}`
  };

  const descriptions = {
    en: `Discover Mister led's ${subCategory} lighting solutions offering ${lightingType}`,
    ar: `اكتشف حلول الإضاءة ${subCategory} من مستر ليد مع مجموعة ${lightingType} الأنيقة والعملية`
  };

  return constructMetadata({
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    image: "/brand/mrled.png",
    icons: "/misterled.ico",
  });
}