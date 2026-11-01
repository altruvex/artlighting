import { Onward } from "@/components/editorial/arrow";
import { SECTION_FRAME } from "@/components/section-heading";
import { POSITIONING } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { BRANDS } from "@/lib/company";
import { formatYear } from "@/lib/numbers";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Who Art Lighting is, in one statement and one paragraph, before any
 * product. The brands it represents close the section as a fact, not a
 * logo wall: two names, what each is, and since when.
 */
export async function Positioning({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.positioning" });

  return (
    <section aria-labelledby="positioning-heading" className={`${SECTION_FRAME} py-20 lg:py-32`}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="positioning-heading" className="statement mt-5 max-w-[22ch]">
            {pick(POSITIONING.statement, locale)}
          </h2>
        </div>
        <div className="space-y-8 lg:col-span-5 lg:pt-10">
          <p className="lede">{pick(POSITIONING.body, locale)}</p>
          <Link
            href="/about-us"
            className="group inline-flex items-center gap-2 border-b border-foreground/30 pb-1 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
          >
            {t("about")}
            <Onward className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </div>

      <ul className="mt-16 grid border-t border-border sm:grid-cols-2 lg:mt-24">
        {BRANDS.map((brand, index) => (
          <li key={brand.id} className={`flex items-center gap-5 py-6 ${index === 1 ? "border-t border-border sm:border-t-0 sm:border-s sm:ps-8" : "sm:pe-8"}`}>
            <span className="relative size-20 shrink-0 sm:size-24">
              <Image src={brand.logo.light} alt={brand.name} fill sizes="96px" className="object-contain dark:hidden" />
              <Image src={brand.logo.dark} alt="" fill sizes="96px" className="hidden object-contain dark:block" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{t(brand.sole ? "soleAgent" : "agent")}</p>
              <p className="text-[length:var(--text-sm)] text-muted-foreground">
                {t(`brand.${brand.id}`)} · {t("since", { year: formatYear(brand.since, locale) })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
