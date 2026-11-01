import { Onward } from "@/components/editorial/arrow";
import { formatIndex } from "@/lib/numbers";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { COMPANY, displayPhone } from "@/lib/company";
import { telLink, whatsappLink } from "@/lib/contact-links";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { SHOWROOM_MAP, SHOWROOM_SOCIAL } from "@/lib/showroom";
import { PagePropsTypes } from "@/types";
import { Facebook, Instagram, MessageCircle, Youtube } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return constructMetadata({ locale, path: "/contact-us", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * How to reach the company.
 *
 * The old page described Art Lighting as "a team of passionate designers
 * and developers" who "empower businesses to create amazing digital
 * experiences" — a template never replaced — and promised a three-year
 * warranty nothing else supports. This one is the channels, the address and
 * the hours, and two ready-made WhatsApp messages for the two reasons
 * people write: choosing for a room, and pricing a project.
 *
 * There is no form: nothing on the server would receive it. Every channel
 * here reaches a person.
 */
export default async function ContactPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "contact" });
  const tCta = await getTranslations({ locale, namespace: "cta" });

  const lines = [
    { label: t("showroom"), note: t("showroomNote"), phone: COMPANY.phones.showroom },
    { label: t("salesManager"), note: t("salesManagerNote"), phone: COMPANY.phones.salesManager },
    { label: t("office"), note: t("officeNote"), phone: COMPANY.phones.landline },
  ];

  const social = [
    { icon: Instagram, label: "Instagram", href: SHOWROOM_SOCIAL.instagram },
    { icon: Facebook, label: "Facebook", href: SHOWROOM_SOCIAL.facebook },
    { icon: Youtube, label: "YouTube", href: SHOWROOM_SOCIAL.youtube },
  ];

  const enquiries = [
    { title: t("roomTitle"), body: t("roomBody"), cta: t("roomCta"), message: t("roomMessage") },
    { title: t("projectTitle"), body: t("projectBody"), cta: t("projectCta"), message: t("projectMessage") },
    { title: t("productTitle"), body: t("productBody"), cta: t("productCta"), message: t("productMessage") },
  ];

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("lede")}</p>} />

      <div className={`${SECTION_FRAME} grid gap-16 pb-20 lg:grid-cols-12 lg:gap-10 lg:pb-28`}>
        <section aria-labelledby="channels-heading" className="lg:col-span-5">
          <h2 id="channels-heading" className="eyebrow">{t("channels")}</h2>
          <dl className="mt-6 border-t border-border">
            {lines.map((line) => (
              <div key={line.phone} className="border-b border-border py-6">
                <dt className="font-semibold">{line.label}</dt>
                <dd className="mt-1">
                  <a
                    href={telLink(line.phone)}
                    dir="ltr"
                    className="font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-medium tabular-nums transition-colors duration-[var(--dur-hover)] hover:text-primary"
                  >
                    {displayPhone(line.phone)}
                  </a>
                  <p className="mt-1 text-[length:var(--text-sm)] text-muted-foreground">{line.note}</p>
                </dd>
              </div>
            ))}
            <div className="border-b border-border py-6">
              <dt className="font-semibold">{t("address")}</dt>
              <dd className="mt-1">
                <address className="not-italic text-pretty">{t("addressValue")}</address>
                <a
                  href={SHOWROOM_MAP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-3 inline-flex items-center gap-2 border-b border-foreground/30 pb-0.5 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                >
                  {t("directions")}
                  <Onward />
                </a>
              </dd>
            </div>
            <div className="border-b border-border py-6">
              <dt className="font-semibold">{t("hours")}</dt>
              <dd className="mt-1 text-muted-foreground">{tCta("workingHours")}</dd>
            </div>
            <div className="py-6">
              <dt className="font-semibold">{t("follow")}</dt>
              <dd className="mt-3">
                <ul className="flex gap-2">
                  {social.map(({ icon: Icon, label, href }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="grid size-10 place-items-center rounded-md border border-border text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                      >
                        <Icon className="size-4" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="write-heading" className="lg:col-span-6 lg:col-start-7">
          <h2 id="write-heading" className="eyebrow">{t("write")}</h2>
          <p className="mt-6 font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold leading-snug text-balance ltr:tracking-tight">{t("writeTitle")}</p>
          <ol className="mt-8 border-t border-border">
            {enquiries.map((enquiry, index) => (
              <li key={enquiry.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-border py-7">
                <span className="index-numeral pt-1">{formatIndex(index + 1, locale)}</span>
                <div>
                  <h3 className="text-[length:var(--text-lg)] font-semibold">{enquiry.title}</h3>
                  <p className="mt-2 text-pretty text-muted-foreground">{enquiry.body}</p>
                  <a
                    href={whatsappLink(enquiry.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    {enquiry.cta}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
