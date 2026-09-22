import { Link } from "@/i18n/navigation";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { formatNumber } from "@/lib/numbers";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/** One photograph per family, chosen from the landing imagery already in the repo. */
const IMAGE: Record<ProductFamily, { src: string; position: string }> = {
  CHANDELIER: { src: "/misterled-landing/landing-2.png", position: "50% 20%" },
  INDOOR: { src: "/balcom-landing/landing4.jpg", position: "50% 30%" },
  // A two-panel composite; the street lamps are on the left half.
  OUTDOOR: { src: "/main-landing/landing-4.png", position: "18% 50%" },
};

const ORDER: ProductFamily[] = ["CHANDELIER", "INDOOR", "OUTDOOR"];

/**
 * The three ways into the catalogue, each with how many products it holds.
 *
 * The counts are live — a family is never advertised as larger than it is —
 * and each tile lands on the shop already filtered, rather than on the
 * top of a four-level funnel.
 *
 * The first tile spans two rows on a wide screen. Three equal tiles in a
 * row is the most generic layout there is; chandeliers are over half the
 * catalogue, so they get the space.
 */
export async function CategoryTiles({
  locale,
  families,
}: {
  locale: string;
  families: { family: ProductFamily; count: number }[];
}) {
  const t = await getTranslations({ locale, namespace: "home.categories" });
  const tFamily = await getTranslations({ locale, namespace: "family" });
  const count = new Map(families.map((entry) => [entry.family, entry.count]));
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");

  return (
    <section aria-labelledby="categories-heading" className={`${SECTION_FRAME} py-16 lg:py-24`}>
      <SectionHeading id="categories-heading" title={t("title")} href="/products" hrefLabel={t("all")} />

      {/* Two columns, not three: with the first tile spanning both rows, a
          three-column grid left two empty cells under the other tiles. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-rows-2">
        {ORDER.filter((family) => (count.get(family) ?? 0) > 0).map((family, index) => (
          <li key={family} className={index === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
            <Link
              href={`/products?family=${familySlug(family)}`}
              className="group relative isolate flex h-full min-h-56 overflow-hidden rounded-2xl lg:min-h-72"
            >
              <Image
                src={IMAGE[family].src}
                alt=""
                fill
                sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "50vw"}
                style={{ objectPosition: IMAGE[family].position }}
                className="-z-10 object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-background/90 via-background/30 to-transparent" />
              <div className="mt-auto flex w-full items-end justify-between gap-3 p-5 sm:p-6">
                <div>
                  <p className="font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold">
                    {tFamily(family)}
                  </p>
                  <p className="text-[length:var(--text-sm)] text-muted-foreground tabular-nums">
                    {t("count", { count: count.get(family) ?? 0, formatted: n(count.get(family) ?? 0) })}
                  </p>
                </div>
                <span className="rounded-full border border-foreground/20 bg-background/40 px-3 py-1.5 text-[length:var(--text-sm)] font-medium backdrop-blur transition-colors duration-[var(--dur-hover)] group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  {t("shop")}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
