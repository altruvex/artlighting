import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import LightingType from "./lighting-type";
import { PagePropsTypes } from "@/types";


export default async function Page({ params }: PagePropsTypes) {
  const { locale: localeParam, subCategory, lightingType } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  if (!subCategory || !lightingType) {
    notFound();
  }
  // The URL segment is a slug, not the stored value. Parsing it here means
  // an unknown section 404s instead of querying for something that cannot
  // exist — which is what the old string column quietly allowed.
  const family = familyFromSlug(subCategory);
  if (!family) notFound();
  try {
    const lightingTypes = await service.getLocalizedLightingTypes("balcom", family, locale) as any[];

    const currentLightingType = lightingTypes.find(
      (lt: any) => lt.slug === lightingType || lt.localizedSlug === lightingType || lt.spotlightType === lightingType
    );

    if (!currentLightingType) {
      console.warn(`Lighting type not found: ${lightingType} in ${subCategory}`);
      notFound();
    }

    const { products, total, hasMore } = await service.getLocalizedProducts(
      {
        brand: "balcom",
        sectionType: family,
        spotlightType: currentLightingType.spotlightType,
      },
      locale,
      { page: 1, limit: 50 }
    );

    const displayName = currentLightingType.localizedName;

    return (
      <>
        <Breadcrumb />
        <LightingType
          products={products}
          subCategory={subCategory}
          lightingType={displayName}
          locale={locale}
          total={total}
          hasMore={hasMore}
        />
      </>
    );
  } catch (error) {
    console.error(`Failed to load products for ${subCategory}/${lightingType}:`, error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground/90 mb-4">
            Error loading products
          </h2>
          <p className="text-muted-foreground">Please try again later.</p>
          <p className="text-xs text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
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
    en: `Balcom ${subCategory} - ${lightingType}`,
    ar: `بالكوم ${subCategory} - ${lightingType}`
  };

  const descriptions = {
    en: `Explore Balcom's collection of ${lightingType} in ${subCategory}. Discover stylish, high-quality lighting at affordable prices.`,
    ar: `استكشف مجموعة بالكوم من ${lightingType} في ${subCategory}. اكتشف إضاءة أنيقة وعالية الجودة بأسعار مناسبة.`
  };

  return constructMetadata({
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    image: "/brand/balcom.png",
    icons: "/balcom.ico",
  });
}
