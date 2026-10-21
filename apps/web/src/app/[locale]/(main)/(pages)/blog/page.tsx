import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import { Metadata } from "next";
import BlogContent from "./blog-content";

export default function Blog() {
  return <BlogContent />;
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const titles = {
    en: "Blog | Linktich",
    ar: "مدونة | Linktich"
  };
  const descriptions = {
    en: "Know About Our Latest News In New Arrivals Products, Events in  egypt and in china",
    ar: "تعرف على أحدث أخبارنا في المنتجات الجديدة والفعاليات في مصر والصين"
  };
  return constructMetadata({
    title: titles[locale as keyof typeof titles] || titles.en,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.en,
  });
}
