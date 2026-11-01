import { Onward } from "@/components/editorial/arrow";
import { SECTION_FRAME } from "@/components/section-heading";
import { applicationsForType } from "@/content/applications";
import { pick } from "@/content/l10n";
import { lightingType } from "@/content/lighting-types";
import { Link } from "@/i18n/navigation";
import { DOCUMENTS } from "@/lib/company";
import { whatsappLink } from "@/lib/contact-links";
import type { ProductFamily } from "@repo/catalog/families";
import { DownloadIcon, FileTextIcon, MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

/**
 * What a spec sheet cannot say on its own: where the fitting belongs, and
 * how to get the information a project needs about it.
 *
 * "Where to use it" comes from the applications that list this product's
 * lighting type (or its family, for chandeliers) — the same data the
 * applications pages are built from, so the two always agree. The support
 * column offers the datasheet only when one has been uploaded, and a
 * WhatsApp message that already names the product code.
 */
export async function ProductContext({
  locale,
  productId,
  productName,
  family,
  typeSlug,
  specSheetUrl,
}: {
  locale: string;
  productId: string;
  productName: string;
  family: ProductFamily;
  typeSlug: string;
  specSheetUrl: string | null;
}) {
  const t = await getTranslations({ locale, namespace: "pdp" });
  const type = lightingType(typeSlug);
  const applications = applicationsForType(typeSlug, family).slice(0, 4);
  const code = productId.toUpperCase();

  return (
    <section aria-labelledby="context-heading" className={`${SECTION_FRAME} pt-16 lg:pt-24`}>
      <div className="grid gap-12 border-t border-border pt-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="eyebrow">{t("whereEyebrow")}</p>
          <h2 id="context-heading" className="mt-4 text-[length:var(--text-2xl)] font-medium leading-tight ltr:tracking-tight">
            {t("whereTitle")}
          </h2>
          {type && <p className="lede mt-4 max-w-2xl">{pick(type.purpose, locale)}</p>}
          {applications.length > 0 && (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {applications.map((application) => (
                <li key={application.slug}>
                  <Link href={`/applications/${application.slug}`} className="group flex items-center gap-4">
                    <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <Image
                        src={application.image}
                        alt=""
                        fill
                        sizes="112px"
                        style={{ objectPosition: application.imagePosition }}
                        className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug group-hover:text-primary">{pick(application.name, locale)}</span>
                      <span className="mt-1 line-clamp-2 block text-[length:var(--text-sm)] text-muted-foreground">{pick(application.summary, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside aria-labelledby="support-heading" className="lg:col-span-4 lg:col-start-9">
          <div className="border-s-2 border-primary ps-6">
            <h2 id="support-heading" className="text-[length:var(--text-lg)] font-semibold">{t("supportTitle")}</h2>
            <p className="mt-2 text-pretty text-[length:var(--text-sm)] text-muted-foreground">{t("supportBody")}</p>
            <ul className="mt-6 space-y-1 text-[length:var(--text-sm)] md:space-y-3">
              {specSheetUrl && (
                <li>
                  <a href={specSheetUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-10 items-center gap-2.5 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary md:min-h-0">
                    <DownloadIcon className="size-4 text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-primary" aria-hidden />
                    {t("datasheet")}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={whatsappLink(t("askMessage", { code, name: productName }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-10 items-center gap-2.5 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary md:min-h-0"
                >
                  <MessageCircle className="size-4 text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-primary" aria-hidden />
                  {t("ask")}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink(t("projectMessage", { code }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-10 items-center gap-2.5 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary md:min-h-0"
                >
                  <Onward className="text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-primary" />
                  {t("projectQuote")}
                </a>
              </li>
              <li>
                <a href={DOCUMENTS.portfolio} download className="group inline-flex min-h-10 items-center gap-2.5 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary md:min-h-0">
                  <FileTextIcon className="size-4 text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-primary" aria-hidden />
                  {t("profile")}
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
