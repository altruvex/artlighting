import { PageHeader } from "@/components/editorial/page-header";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BlogContent from "./blog-content";

/** A "coming soon" notice, opened the way every company page is. */
export default async function Blog({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const [t, tFooter] = await Promise.all([
    getTranslations({ locale, namespace: "jetra" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: tFooter("blog") }]} eyebrow={t("comingSoon")} title={t("title")} lede={<p>{t("subtitle")}</p>} />
      <BlogContent />
    </>
  );
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const titles = {
    en: "Blog | Art lighting",
    ar: "مدونة | ارت لايتنج"
  };
  const descriptions = {
    en: "Know About Our Latest News In New Arrivals Products, Events in  egypt and in china",
    ar: "تعرف على أحدث أخبارنا في المنتجات الجديدة والفعاليات في مصر والصين"
  };
  return constructMetadata({
    locale,
    path: "/blog",
    // A single "coming soon" notice is not a page worth indexing; it comes
    // back into the index and the footer when there is news to publish.
    noIndex: true,
    title: titles[locale as keyof typeof titles] || titles.en,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.en,
  });
}
