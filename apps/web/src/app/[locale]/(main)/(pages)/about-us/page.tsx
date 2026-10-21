import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { constructMetadata } from "@/lib/metadata";
import AboutLanding from "./about-landing/about-landing";
import Achievements from "./achievements/achievements";
import Mission from "./mission-vision/mission-vision";
import Product from "./product/product";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { Metadata } from "next";
import { PagePropsTypes } from "@/types";


export default function AboutUsPage() {
  return (
    <div>
      <Breadcrumb />
      <AboutLanding />
      <Achievements />
      <Mission />
      <Product />
    </div>
  );
};
export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const titles = {
    en: "About Us - Linktich | Your Lighting Store",
    ar: "اكتشف أبرز العلامات التجارية للإضاءة:(بالكوم، ميستر ليد، وجيترا)"
  };
  const descriptions = {
    en: "About our Company, what we serve , Mission and Vision",
    ar: "نبذة عن شركتنا، ما نقدمه، رسالتنا ورؤيتنا"
  };
  return constructMetadata({
    title: titles[locale as keyof typeof titles] || titles.en,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.en,
  });
}
