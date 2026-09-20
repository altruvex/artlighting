import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { attempt } from "@/lib/attempt";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import SubCategory from "./sub-category";

export default async function Page({ params }: PagePropsTypes) {
  const { subCategory } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  const t = await getTranslations('error')

  if (!subCategory) {
    notFound()
  }

  const family = familyFromSlug(subCategory)

  if (!family) notFound()
  // A section with no lighting types is a 404, not a failure. The check sits
  // outside the catch so the interrupt reaches Next — see lib/attempt.
  const loaded = await attempt(
    () => service.getLocalizedLightingTypes("mister-led", family, locale) as Promise<any[]>,
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
    () => service.getLocalizedLightingTypes("mister-led", family, locale) as Promise<any[]>,
  );

  if (!loaded.ok) {
    console.error("Error generating metadata:", loaded.error);
    return constructMetadata({
      title: "Mister Led Products",
      description: "Explore our Mister Led product range.",
      image: "/brand/mrled.png",
      icons: "/misterled.ico",
    });
  }

  // Outside the catch. A section that renders as a 404 must not also emit
  // "index, follow" from a fallback — see lib/attempt.
  const localizedLightingTypes = loaded.value;
  if (!localizedLightingTypes.length) notFound();

  const titles = {
    en: `Elegant ${localizedLightingTypes[0]?.localizedCategoryName} from Mister Led - Elevate Your Home Lighting`,
    ar: `نجف أنيق من مستر ليد - ارتقِ بإضاءة منزلك`
  };

  const descriptions = {
    en: `Discover our exquisite collection of ${localizedLightingTypes[0]?.localizedCategoryName} that bring elegance and style to any room. Find the perfect piece to illuminate and enhance your home's décor at affordable prices.`,
    ar: `اكتشف مجموعتنا الفاخرة من ${localizedLightingTypes[0]?.localizedCategoryName} التي تضيف لمسة من الأناقة والفخامة لأي غرفة. ابحث عن القطعة المثالية لإضاءة منزلك وإبراز جمال ديكورك بأسعار مناسبة.`
  };

  return constructMetadata({
    title: titles[locale],
    description: descriptions[locale],
    image: "/brand/mrled.png",
    icons: "/misterled.ico",
  });
}
