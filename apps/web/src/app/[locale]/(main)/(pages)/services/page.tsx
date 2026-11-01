import { ClosingCta } from "@/components/closing-cta";
import { formatIndex } from "@/lib/numbers";
import { Onward } from "@/components/editorial/arrow";
import { JsonLd } from "@/components/editorial/json-ld";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { AUDIENCES, SERVICE_COPY } from "@/content/company-copy";
import { pick, pickList } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { availableServices, DOCUMENTS, type ServiceId } from "@/lib/company";
import { whatsappLink } from "@/lib/contact-links";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { absoluteUrl, ORGANIZATION_ID } from "@/lib/site";
import { PagePropsTypes } from "@/types";
import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "services" });
  return constructMetadata({ locale, path: "/services", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * How Art Lighting works with a customer — the services it offers today.
 *
 * Rendered from SERVICES in lib/company, so a service switched off there
 * (lighting studies, for now) appears nowhere. Each one is a numbered
 * section with what it is, what it includes and the one way to start it.
 */
export default async function ServicesPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "services" });
  const services = availableServices();

  const action = (id: ServiceId) => {
    switch (id) {
      case "selection":
        return { href: whatsappLink(t("whatsappSelection")), external: true };
      case "projects":
        return { href: whatsappLink(t("whatsappProject")), external: true };
      case "documentation":
        return { href: DOCUMENTS.portfolio, external: true, download: true };
      default:
        return { href: "/contact-us", external: false };
    }
  };

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t("title"),
          url: absoluteUrl(locale, "/services"),
          itemListElement: services.map((id, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: { "@type": "Service", name: pick(SERVICE_COPY[id].title, locale), description: pick(SERVICE_COPY[id].summary, locale), provider: { "@id": ORGANIZATION_ID } },
          })),
        }}
      />
      <PageHeader
        locale={locale}
        crumbs={[{ label: t("crumb") }]}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lede={<p>{t("lede")}</p>}
        aside={
          <ul className="space-y-2 border-s border-border ps-5 text-[length:var(--text-sm)]">
            <li className="mb-3 font-semibold">{t("forWhom")}</li>
            {pickList(AUDIENCES, locale).map((audience) => (
              <li key={audience} className="text-muted-foreground">{audience}</li>
            ))}
          </ul>
        }
      />

      <div className={SECTION_FRAME}>
        {services.map((id, index) => {
          const copy = SERVICE_COPY[id];
          const cta = action(id);
          return (
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-heading`}
              className="grid scroll-mt-28 gap-6 border-b border-border py-14 lg:grid-cols-12 lg:gap-10 lg:py-20"
            >
              <span className="index-numeral lg:col-span-1 lg:pt-2">{formatIndex(index + 1, locale)}</span>
              <div className="lg:col-span-5">
                <h2 id={`${id}-heading`} className="text-[length:var(--text-2xl)] font-medium leading-tight ltr:tracking-tight">
                  {pick(copy.title, locale)}
                </h2>
                <p className="lede mt-4">{pick(copy.summary, locale)}</p>
              </div>
              <div className="lg:col-span-5 lg:col-start-8">
                <ul className="space-y-3">
                  {pickList(copy.points, locale).map((point) => (
                    <li key={point} className="flex gap-3">
                      <CheckIcon className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                {cta.external ? (
                  <a
                    href={cta.href}
                    {...(cta.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                    className="group mt-8 inline-flex items-center gap-2 border-b border-foreground/30 pb-1 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                  >
                    {pick(copy.cta, locale)}
                    <Onward />
                  </a>
                ) : (
                  <Link
                    href={cta.href}
                    className="group mt-8 inline-flex items-center gap-2 border-b border-foreground/30 pb-1 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                  >
                    {pick(copy.cta, locale)}
                    <Onward />
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* What a project enquiry should include — so the first reply can be
          a quotation, not a list of questions. */}
      <section aria-labelledby="enquiry-heading" className="border-b border-border bg-card/40">
        <div className={`${SECTION_FRAME} grid gap-12 py-20 lg:grid-cols-12 lg:gap-10 lg:py-28`}>
          <div className="lg:col-span-5">
            <p className="eyebrow">{t("enquiryEyebrow")}</p>
            <h2 id="enquiry-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
              {t("enquiryTitle")}
            </h2>
            <p className="lede mt-6">{t("enquiryBody")}</p>
            <div className="relative mt-10 hidden aspect-[4/3] overflow-hidden rounded-sm bg-muted lg:block">
              <Image src="/balcom-landing/landing2.png" alt={t("enquiryImageAlt")} fill sizes="35vw" className="object-cover" />
            </div>
          </div>
          <ol className="lg:col-span-6 lg:col-start-7">
            {[1, 2, 3, 4].map((step) => (
              <li key={step} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t border-border py-7 last:border-b">
                <span className="index-numeral pt-1">{formatIndex(step, locale)}</span>
                <div>
                  <h3 className="text-[length:var(--text-lg)] font-semibold">{t(`step${step}Title`)}</h3>
                  <p className="mt-2 text-pretty text-muted-foreground">{t(`step${step}Body`)}</p>
                </div>
              </li>
            ))}
            <li className="pt-8">
              <a
                href={whatsappLink(t("whatsappProject"))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2.5 rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-[transform,background-color] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
              >
                {t("enquiryCta")}
                <Onward />
              </a>
            </li>
          </ol>
        </div>
      </section>

      <ClosingCta locale={locale} />
    </>
  );
}
