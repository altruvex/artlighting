import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { attempt } from "@/lib/attempt";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import LightingType from "./lighting-type";
import { PagePropsTypes } from "@/types";


export default async function Page({ params }: PagePropsTypes) {
  const { locale: localeParam, subCategory, lightingType } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  const t = await getTranslations('error');
  if (!subCategory || !lightingType) {
    notFound();
  }
  // The URL segment is a slug, not the stored value. Parsing it here means
  // an unknown section 404s instead of querying for something that cannot
  // exist — which is what the old string column quietly allowed.
  const family = familyFromSlug(subCategory);
  if (!family) notFound();

  // The loading is what can fail; a lighting type that does not exist is a
  // 404, not a failure. Keeping them apart keeps notFound() out of a catch
  // — see lib/attempt.
  const loaded = await attempt(async () => {
    const lightingTypes = await service.getLocalizedLightingTypes("balcom", family, locale) as any[];

    const currentLightingType = lightingTypes.find(
      (lt: any) => lt.slug === lightingType || lt.localizedSlug === lightingType || lt.spotlightType === lightingType
    );

    if (!currentLightingType) return null;

    const { products, total, hasMore } = await service.getLocalizedProducts(
      {
        brand: "balcom",
        sectionType: family,
        spotlightType: currentLightingType.spotlightType,
      },
      locale,
      { page: 1, limit: 50 }
    );

    return { displayName: currentLightingType.localizedName as string, products, total, hasMore };
  });

  if (!loaded.ok) {
    console.error(`Failed to load products for ${subCategory}/${lightingType}:`, loaded.error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground/90 mb-4">
            {t('title')}
          </h2>
          <p className="text-muted-foreground">{t('message')}</p>
        </div>
      </div>
    );
  }

  if (!loaded.value) {
    console.warn(`Lighting type not found: ${lightingType} in ${subCategory}`);
    notFound();
  }

  const { displayName, products, total, hasMore } = loaded.value;

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
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const { subCategory, lightingType } = await params;
  const locale = getLocaleFromParams(await params);
  if (!subCategory || !lightingType) {
    notFound();
  }
  const family = familyFromSlug(subCategory);
  if (!family) notFound();

  // Both segments are slugs. Dropping them into a title put a bare English
  // "indoor" and "track-light" in the middle of the Arabic one; the names
  // the catalogue already stores per language are the copy.
  const { service } = await getServerI18n(locale);
  const tFamily = await getTranslations("family");
  const familyName = tFamily(family);

  const loaded = await attempt(
    () => service.getLocalizedLightingTypes("balcom", family, locale) as Promise<any[]>,
  );
  const lightingTypeName = loaded.ok
    ? (loaded.value.find(
        (lt: any) => lt.slug === lightingType || lt.localizedSlug === lightingType || lt.spotlightType === lightingType,
      )?.localizedName ?? lightingType)
    : lightingType;

  const titles = {
    en: `Balcom ${familyName} - ${lightingTypeName}`,
    ar: `بالكوم ${familyName} - ${lightingTypeName}`
  };

  const descriptions = {
    en: `Explore Balcom's collection of ${lightingTypeName} in ${familyName.toLowerCase()}. Discover stylish, high-quality lighting at affordable prices.`,
    ar: `استكشف مجموعة بالكوم من ${lightingTypeName} في ${familyName}. اكتشف إضاءة أنيقة وعالية الجودة بأسعار مناسبة.`
  };

  return constructMetadata({
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    image: "/brand/balcom.png",
    icons: "/balcom.ico",
  });
}
