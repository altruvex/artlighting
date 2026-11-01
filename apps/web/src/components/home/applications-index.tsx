import { formatIndex } from "@/lib/numbers";
import { SECTION_FRAME } from "@/components/section-heading";
import { APPLICATIONS } from "@/content/applications";
import { pick } from "@/content/l10n";
import { getTranslations } from "next-intl/server";
import { ApplicationsExplorer } from "./applications-explorer";

/**
 * "What are you lighting?" — the applications, as an index beside a
 * picture of the space (see ApplicationsExplorer). The heading and its
 * lede stay server-rendered; only the pointing is client-side.
 */
export async function ApplicationsIndex({ locale, headingLevel = "h2" }: { locale: string; headingLevel?: "h2" | "h1" }) {
  const t = await getTranslations({ locale, namespace: "home.applications" });
  const Heading = headingLevel;

  return (
    <section aria-labelledby="applications-heading" className="border-t border-border bg-card/40">
      <div className={`${SECTION_FRAME} py-20 lg:py-28`}>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="eyebrow">{t("eyebrow")}</p>
            <Heading id="applications-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
              {t("title")}
            </Heading>
          </div>
          <p className="lede lg:col-span-6 lg:col-start-7 lg:pt-10">{t("body")}</p>
        </div>

        <ApplicationsExplorer
          items={APPLICATIONS.map((application, index) => ({
            slug: application.slug,
            index: formatIndex(index + 1, locale),
            name: pick(application.name, locale),
            summary: pick(application.summary, locale),
            image: application.image,
            imagePosition: application.imagePosition,
          }))}
        />
      </div>
    </section>
  );
}
