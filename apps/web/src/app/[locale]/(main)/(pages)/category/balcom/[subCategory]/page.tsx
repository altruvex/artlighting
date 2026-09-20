import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { familyFromSlug } from "@repo/catalog";
import { getLocaleFromParams, getServerI18n } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { notFound } from "next/navigation";
import SubCategory from "./sub-category";
import { PagePropsTypes } from "@/types";

export default async function Page({ params }: PagePropsTypes) {
  const { subCategory } = await params;
  const locale = getLocaleFromParams(await params);
  const { service } = await getServerI18n(locale);
  if (!subCategory) {
    notFound()
  }
  const family = familyFromSlug(subCategory)
  if (!family) notFound()
  try {
    const localizedLightingTypes = await service.getLocalizedLightingTypes(
      "balcom",
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
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Error loading lighting types
          </h2>
          <p className="text-muted-foreground">
            Please try again later.
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
      "balcom",
      family,
      locale
    ) as any[];

    if (!localizedLightingTypes.length) {
      notFound();
    }


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
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Balcom Products",
      description: "Explore our Balcom product range.",
      image: "/brand/balcom.png",
      icons: "/balcom.ico",
    });
  }
}