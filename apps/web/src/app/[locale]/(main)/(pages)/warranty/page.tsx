import { ContentPolicy } from "@/components/editorial/content-policy";
import { pick } from "@/content/l10n";
import { WARRANTY } from "@/content/policies";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  return constructMetadata({
    locale,
    path: "/warranty",
    title: `${pick(WARRANTY.title, locale)} | ${locale === "ar" ? "آرت لايتنج" : "Art Lighting"}`,
    description: pick(WARRANTY.metaDescription, locale),
  });
}

export default async function Page({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  return <ContentPolicy locale={locale} id="warranty" content={WARRANTY} />;
}
