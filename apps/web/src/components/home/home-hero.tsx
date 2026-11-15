import { Onward } from "@/components/editorial/arrow";
import { SECTION_FRAME } from "@/components/section-heading";
import { Link } from "@/i18n/navigation";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/** A short shopping introduction; the catalogue stays close to the first screen. */
export async function HomeHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.hero" });

  return (
    <section
      aria-labelledby="hero-heading"
      className="border-b border-border bg-secondary/40"
    >
      <div
        className={`${SECTION_FRAME} grid items-center gap-8 py-8 sm:py-10 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-10`}
      >
        <div className="max-w-xl py-2 lg:py-6">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1
            id="hero-heading"
            className="mt-4 max-w-[17ch] text-[length:var(--text-4xl)] font-medium leading-[1.12] ltr:tracking-tight rtl:leading-[1.3]"
          >
            {t("title")}
          </h1>
          <p className="mt-5 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/products" className="store-primary-action">
              <ShoppingBag className="size-4" aria-hidden />
              {t("catalogue")}
              <Onward />
            </Link>
            <Link
              href="/applications"
              className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              {t("applications")}
              <Onward />
            </Link>
          </div>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-muted lg:aspect-[4/3]">
          <Image
            src="/balcom-landing/landing4.jpg"
            alt={t("imageAlt")}
            fill
            preload
            sizes="(min-width: 1024px) 48vw, 100vw"
            quality={75}
            className="object-cover object-[50%_35%]"
          />
        </div>
      </div>
    </section>
  );
}
