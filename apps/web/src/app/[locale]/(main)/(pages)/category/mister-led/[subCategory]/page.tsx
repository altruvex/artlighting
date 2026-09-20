import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
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
  try {
    const localizedLightingTypes = await service.getLocalizedLightingTypes(
      "mister-led",
      family,
      locale
    ) as any[];

    if (!localizedLightingTypes.length) {
      notFound();
    }

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
  } catch (error) {
    console.error(`Failed to load ${subCategory} lighting types:`, error);
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
export async function generateMetadata({ params }: PagePropsTypes) {
  const { subCategory } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);

  const family = familyFromSlug(subCategory);
  if (!subCategory || !family) {
    notFound();
  }

  try {
    const localizedLightingTypes = await service.getLocalizedLightingTypes(
      "mister-led",
      family,
      locale
    ) as any[];

    if (!localizedLightingTypes.length) {
      notFound();
    }


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
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Mister Led Products",
      description: "Explore our Mister Led product range.",
      image: "/brand/mrled.png",
      icons: "/misterled.ico",
    });
  }
}