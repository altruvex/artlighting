import { Onward } from "@/components/editorial/arrow";
import { FileText, Headset, Lightbulb, PackageCheck } from "lucide-react";
import { SECTION_FRAME } from "@/components/section-heading";
import { SERVICE_COPY } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { availableServices } from "@/lib/company";
import { getTranslations } from "next-intl/server";

/**
 * How Art Lighting works with people — only the services it offers today
 * (see SERVICES in lib/company). Four numbered columns under one rule, set
 * beside a photograph of the thing all of it is about: a beam, aimed.
 */
export async function ServicesOverview({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.services" });
  const services = availableServices();
  const icons = {
    selection: Lightbulb,
    projects: PackageCheck,
    documentation: FileText,
    aftersales: Headset,
    studies: FileText,
  };

  return (
    <section
      aria-labelledby="services-heading"
      className={`${SECTION_FRAME} py-12 lg:py-16`}
    >
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2
            id="services-heading"
            className="mt-4 text-[length:var(--text-2xl)] font-medium leading-tight ltr:tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="lede mt-6">{t("body")}</p>
        </div>

        <ol className="grid content-start gap-x-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
          {services.map((id) => {
            const copy = SERVICE_COPY[id];
            const Icon = icons[id];
            return (
              <li key={id} className="border-t border-border pt-5 pb-7">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-3 text-[length:var(--text-lg)] font-medium leading-snug">
                  {pick(copy.title, locale)}
                </h3>
                <p className="mt-3 text-pretty text-muted-foreground">
                  {pick(copy.summary, locale)}
                </p>
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
