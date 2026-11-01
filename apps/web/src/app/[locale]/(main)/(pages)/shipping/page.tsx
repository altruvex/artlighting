import { PolicyDocument } from "@/components/editorial/policy-document";
import { Link } from "@/i18n/navigation";
import { STANDARD_SHIPPING } from "@/lib/checkout.server";
import { COMPANY, displayPhone } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumberWithConversion } from "@/lib/numbers";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "shipping" });
  return constructMetadata({ locale, path: "/shipping", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * Delivery and payment, from what the checkout actually does: the flat
 * charge is the constant the order is priced with, so this page and the
 * cart cannot disagree about it.
 */
export default async function ShippingPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "shipping" });
  const fee = formatNumberWithConversion(STANDARD_SHIPPING, locale);
  const phone = displayPhone(COMPANY.phones.showroom);

  const sections = [
    { id: "time", title: t("timeTitle"), body: <p>{t("timeBody")}</p> },
    {
      id: "cost",
      title: t("costTitle"),
      body: (
        <>
          <p>{t("costBody", { fee })}</p>
          <p className="callout">{t("costOutside")}</p>
        </>
      ),
    },
    { id: "payment", title: t("paymentTitle"), body: <p>{t("paymentBody")}</p> },
    {
      id: "projects",
      title: t("projectsTitle"),
      body: (
        <p>
          {t("projectsBody")} <Link href="/services#projects">{t("projectsLink")}</Link>
        </p>
      ),
    },
    {
      id: "questions",
      title: t("questionsTitle"),
      body: (
        <p>
          {t("questionsBody")} <a href={`tel:${COMPANY.phones.showroom}`} dir="ltr">{phone}</a>
        </p>
      ),
    },
  ];

  return <PolicyDocument locale={locale} id="shipping" title={t("title")} lede={t("lede")} sections={sections} />;
}
