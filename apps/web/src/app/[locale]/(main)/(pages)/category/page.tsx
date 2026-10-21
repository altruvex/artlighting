import { constructMetadata } from "@/lib/metadata";
import CategoryContent from "./category-content";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { Metadata } from "next";
import { PagePropsTypes } from "@/types";

export default async function page({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  return <CategoryContent locale={locale} />;
}
export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const titles = {
    en: "Explore All lighting Brands that give a solution of every lighting situation (Balcom | Mister Led | Jetra )",
    ar: "اكتشف أبرز العلامات التجارية للإضاءة:(بالكوم، ميستر ليد، وجيترا)"
  };
  const descriptions = {
    en: "Elevate your space with Linktich. Our curated collection of lighting solutions caters to every style and need. Whether you're looking to create a cozy ambiance or illuminate a large area, we have the perfect lighting fixture for you. Shop now and discover the difference quality lighting can make.",
    ar: "ارتقِ بمساحتك مع مجموعتنا المنتقاة بعناية من حلول الإضاءة. منتجاتنا مصممة لتلبية كل الأذواق والاحتياجات. سواء كنت تسعى لخلق أجواء دافئة ومريحة أو إضاءة مساحة واسعة، لدينا قطعة الإضاءة المثالية لك. تسوق الآن واكتشف الفارق الذي تحدثه الإضاءة عالية الجودة."
  };
  return constructMetadata({
    title: titles[locale as keyof typeof titles] || titles.en,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.en,
    image: "/brand/mrled.png",
    icons: "/misterled.ico",
  });
}
