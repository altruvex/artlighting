import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { attempt } from "@/lib/attempt";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import SubCategory from "./sub-category";
import { PagePropsTypes } from "@/types";

export default async function Page({ params }: PagePropsTypes) {
  const { subCategory } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  const t = await getTranslations('error');
  if (!subCategory) {
    notFound()
  }
  const family = familyFromSlug(subCategory)
  if (!family) notFound()
  // A section with no lighting types is a 404, not a failure. The check sits
  // outside the catch so the interrupt reaches Next — see lib/attempt.
  const loaded = await attempt(
    () => service.getLocalizedLightingTypes("balcom", family, locale) as Promise<any[]>,
  );

  if (!loaded.ok) {
    console.error(`Failed to load ${subCategory} lighting types:`, loaded.error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground/90 mb-4">
            {t('title')}
          </h2>
          <p className="text-muted-foreground">
            {t('message')}
          </p>
        </div>
      </div>
    );
  }

  const localizedLightingTypes = loaded.value;
  if (!localizedLightingTypes.length) notFound();

  return (
    <>
      <Breadcrumb />
      <SubCategory
        subCategorySlug={subCategory}
        subCategoryName={localizedLightingTypes[0]?.localizedCategoryName ?? subCategory}
        lightingTypes={localizedLightingTypes}
        locale={locale}
      />
    </>
  );
}

export async function generateMetadata({ params }: PagePropsTypes) {
  const { subCategory } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  const family = familyFromSlug(subCategory);
  if (!subCategory || !family) {
    notFound();
  }

  const loaded = await attempt(
    () => service.getLocalizedLightingTypes("balcom", family, locale) as Promise<any[]>,
  );

  if (!loaded.ok) {
    console.error("Error generating metadata:", loaded.error);
    return constructMetadata({
      title: "Balcom Products",
      description: "Explore our Balcom product range.",
      image: "/brand/balcom.png",
      icons: "/balcom.ico",
    });
  }

  // Outside the catch. A section that renders as a 404 must not also emit
  // "index, follow" from a fallback — see lib/attempt.
  const localizedLightingTypes = loaded.value;
  if (!localizedLightingTypes.length) notFound();

  const titles = {
    en: `Explore ${localizedLightingTypes[0]?.localizedCategoryName} - Balcom Products`,
    ar: `استكشف ${localizedLightingTypes[0]?.localizedCategoryName} - منتجات بالكوم`
  };

  const descriptions = {
    en: `Discover the best ${localizedLightingTypes[0]?.localizedCategoryName} products in our Balcom collection. Check out our range of high-quality products at affordable prices.`,
    ar: `اكتشف أفضل منتجات ${localizedLightingTypes[0]?.localizedCategoryName} في مجموعة بالكوم. تحقق من مجموعتنا من المنتجات عالية الجودة بأسعار معقولة.`
  };

  return constructMetadata({
    title: titles[locale],
    description: descriptions[locale],
    image: "/brand/balcom.png",
    icons: "/balcom.ico",
  });
}
