import { PolicyDocument } from "@/components/editorial/policy-document";
import { COMPANY, displayPhone } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "privacy" });
  return constructMetadata({ locale, path: "/privacy", title: t("metaTitle"), description: t("metaDescription") });
}

const SECTIONS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

/**
 * The privacy policy — the company's own text, unchanged, set as a
 * document. Its "last updated" line printed today's date on every visit, so
 * the policy always claimed to have just changed; it is gone until the
 * policy carries a real effective date.
 */
export default async function PrivacyPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "privacy" });
  const phone = displayPhone(COMPANY.phones.showroom);

  const sections = SECTIONS.map((key) => {
    const list = t.has(`${key}.list`) ? (t.raw(`${key}.list`) as string[]) : [];
    return {
      id: key,
      title: t(`${key}.title`).replace(/^\d+\.\s*/, ""),
      body: (
        <>
          <h3 className="!mt-4 !text-[length:var(--text-base)]">{t(`${key}.q1`)}</h3>
          <p>{t(`${key}.desc`)}</p>
          {list.length > 0 && (
            <ul>
              {list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {key === "s6" && (
            <p>
              <a href={`tel:${COMPANY.phones.showroom}`} dir="ltr">{phone}</a>
            </p>
          )}
          {t.has(`${key}.footer`) && <p>{t(`${key}.footer`)}</p>}
        </>
      ),
    };
  });

  return <PolicyDocument locale={locale} id="privacy" title={t("title")} lede={t("lede")} sections={sections} />;
}
