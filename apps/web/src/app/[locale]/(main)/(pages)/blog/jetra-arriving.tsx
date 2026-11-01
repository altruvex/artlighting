import { SECTION_FRAME } from "@/components/section-heading";
import { useTranslations } from "next-intl";
import Image from "next/image";

/**
 * The notice under the page header: the brand's mark and one line on what
 * is coming. It was a centred card with its own title, a gold heading and
 * type sizes of its own; the page's title and lede now belong to the
 * PageHeader every company page opens with, and this is set beside a rule
 * like the rest of them.
 */
export default function JetraArriving() {
  const t = useTranslations("jetra");

  return (
    <section aria-label={t("comingSoon")} className={`${SECTION_FRAME} pb-20 lg:pb-28`}>
      <div className="flex max-w-2xl items-center gap-6 border-b border-border pb-10 sm:gap-8">
        <div className="relative size-24 shrink-0 sm:size-28">
          {/* The file was /brand/jetra.png, which does not exist; the
              brand folder holds a light and a dark version. */}
          <Image fill sizes="112px" src="/brand/jetra-black.png" alt={t("brandAlt")} className="object-contain dark:hidden" />
          <Image fill sizes="112px" src="/brand/jetra-white.png" alt="" className="hidden object-contain dark:block" />
        </div>
        <p className="border-s border-border ps-6 text-pretty text-muted-foreground sm:ps-8">{t("description")}</p>
      </div>
    </section>
  );
}
