import { Onward } from "@/components/editorial/arrow";
import { Link } from "@/i18n/navigation";
import { COMPANY } from "@/lib/company";
import { formatNumber, formatYear } from "@/lib/numbers";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * The first screen: the company before the catalogue.
 *
 * It used to open on "Light that makes a room", an offer chip and "Shop all
 * lighting" — the first screen of a shop. What a first-time visitor now
 * learns is who Art Lighting is and how long it has been doing it, and is
 * offered two ways on: the catalogue, or the question most customers
 * actually arrive with — what am I lighting? The live offers still lead
 * the page, in the promo bar above.
 *
 * The facts row is only what can be checked: the founding year and the
 * Balcom agency from the company profile, and the catalogue count live
 * from the database.
 */
export async function HomeHero({ locale, productCount }: { locale: string; productCount: number }) {
  const t = await getTranslations({ locale, namespace: "home.hero" });
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");

  const facts = [
    { value: formatYear(COMPANY.founded, locale), label: t("factFounded") },
    { value: t("factAgentValue"), label: t("factAgent") },
    { value: n(productCount), label: t("factProducts") },
    { value: n(2), label: t("factBrands") },
  ];

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-[oklch(0.16_0.006_60)] text-[oklch(0.975_0.002_80)]">
      <Image
        src="/balcom-landing/landing4.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={70}
        className="-z-10 object-cover object-[50%_45%] opacity-70"
      />
      {/* The photograph is architecture lit by linear light; the veil keeps
          the copy on the dark end of it in either theme — this section is
          always dark, like a room at night. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-[oklch(0.16_0.006_60)] via-[oklch(0.16_0.006_60/0.55)] to-[oklch(0.16_0.006_60/0.2)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-[oklch(0.16_0.006_60/0.85)] to-transparent rtl:bg-linear-to-l" />

      <div className="mx-auto flex min-h-[min(calc(100dvh-7.5rem),50rem)] max-w-screen-2xl flex-col justify-end px-4 pt-20 pb-8 sm:px-6 lg:px-10 lg:pb-14">
        <div className="max-w-3xl">
          <p className="eyebrow !text-[color:var(--gold-300)]">{t("eyebrow")}</p>
          <h1 id="hero-heading" className="mt-5 text-[length:var(--text-4xl)] font-medium leading-[1.04] ltr:tracking-tight rtl:leading-[1.3]">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-xl text-[length:var(--text-lg)] leading-relaxed text-[oklch(0.975_0.002_80/0.78)]">{t("body")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="group inline-flex h-12 items-center gap-2.5 rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-[transform,background-color] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
            >
              {t("catalogue")}
              <Onward className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href="/applications"
              className="inline-flex h-12 items-center rounded-md border border-[oklch(1_0_0/0.28)] px-6 font-semibold transition-colors duration-[var(--dur-hover)] hover:border-[oklch(1_0_0/0.6)] hover:bg-[oklch(1_0_0/0.06)]"
            >
              {t("applications")}
            </Link>
          </div>
        </div>

        <dl className="mt-14 grid grid-cols-2 border-t border-[oklch(1_0_0/0.16)] lg:mt-20 lg:grid-cols-4">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              // A rule between neighbours only: two columns on a phone, four on a wide screen.
              className={[
                "flex flex-col-reverse py-5 pe-4 border-[oklch(1_0_0/0.16)]",
                index % 2 === 1 ? "border-s ps-4 lg:ps-5" : "",
                index === 2 ? "lg:border-s lg:ps-5" : "",
                index >= 2 ? "border-t lg:border-t-0" : "",
              ].join(" ")}
            >
              <dt className="mt-1 text-[length:var(--text-sm)] text-[oklch(0.975_0.002_80/0.62)]">{fact.label}</dt>
              <dd className="font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-medium tabular-nums">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
