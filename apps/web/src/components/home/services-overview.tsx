import { Onward } from "@/components/editorial/arrow";
import { formatIndex } from "@/lib/numbers";
import { SECTION_FRAME } from "@/components/section-heading";
import { SERVICE_COPY } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { availableServices } from "@/lib/company";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * How Art Lighting works with people — only the services it offers today
 * (see SERVICES in lib/company). Four numbered columns under one rule, set
 * beside a photograph of the thing all of it is about: a beam, aimed.
 */
export async function ServicesOverview({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.services" });
  const services = availableServices();

  return (
    <section aria-labelledby="services-heading" className={`${SECTION_FRAME} py-20 lg:py-28`}>
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="services-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
            {t("title")}
          </h2>
          <p className="lede mt-6">{t("body")}</p>
          <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden rounded-sm bg-muted lg:block">
            <Image
              src="/balcom-landing/landing1.jpg"
              alt={t("imageAlt")}
              fill
              sizes="30vw"
              className="object-cover object-[78%_50%]"
            />
          </div>
        </div>

        <ol className="grid content-start gap-x-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
          {services.map((id, index) => {
            const copy = SERVICE_COPY[id];
            return (
              <li key={id} className="border-t border-border pt-6 pb-10">
                <span className="index-numeral">{formatIndex(index + 1, locale)}</span>
                <h3 className="mt-3 text-[length:var(--text-xl)] font-medium leading-snug">{pick(copy.title, locale)}</h3>
                <p className="mt-3 text-pretty text-muted-foreground">{pick(copy.summary, locale)}</p>
              </li>
            );
          })}
          <li className="sm:col-span-2">
            <Link
              href="/services"
              className="group inline-flex items-center gap-2 border-b border-foreground/30 pb-1 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
            >
              {t("more")}
              <Onward className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </li>
        </ol>
      </div>
    </section>
  );
}
