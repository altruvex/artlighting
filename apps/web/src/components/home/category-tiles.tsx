import { Link } from "@/i18n/navigation";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { formatNumber } from "@/lib/numbers";
import type { HomeData } from "@/lib/shop.server";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { LIGHTING_TYPES } from "@/content/lighting-types";
import { pick } from "@/content/l10n";
import Image from "next/image";
import { Onward } from "@/components/editorial/arrow";

const FAMILIES = [
  {
    family: "INDOOR",
    image: "/balcom-landing/landing2.png",
    position: "50% 50%",
  },
  {
    family: "CHANDELIER",
    image: "/misterled-landing/landing-2.png",
    position: "50% 25%",
  },
  {
    family: "OUTDOOR",
    image: "/projects/al-galala-resort/al-galala-resort-3.jpg",
    position: "50% 65%",
  },
] satisfies { family: ProductFamily; image: string; position: string }[];

const SHORTCUTS = [
  "cob",
  "linear",
  "track-light",
  "panel-light",
  "strip",
  "bollard",
  "flood-light",
  "uplight",
];

import { getTranslations } from "next-intl/server";

/** Clear photo shelves and compact type links, all backed by active catalogue rows. */
export async function CategoryTiles({
  locale,
  families,
  types,
}: {
  locale: string;
  families: HomeData["families"];
  types: HomeData["types"];
}) {
  const [t, tFamily, tHeader] = await Promise.all([
    getTranslations({ locale, namespace: "home.categories" }),
    getTranslations({ locale, namespace: "family" }),
    getTranslations({ locale, namespace: "header" }),
  ]);
  const shortNames = {
    INDOOR: "indoorShort",
    CHANDELIER: "chandelierShort",
    OUTDOOR: "outdoorShort",
  } as const;
  const counts = new Map(families.map((entry) => [entry.family, entry.count]));
  const shortcuts = SHORTCUTS.flatMap(
    (id) => types.find((entry) => entry.id === id) ?? [],
  );
  if (!families.length) return null;

  return (
    <section
      aria-labelledby="categories-heading"
      className={`${SECTION_FRAME} py-10 lg:py-14`}
    >
      <SectionHeading
        id="categories-heading"
        title={t("title")}
        href="/products"
        hrefLabel={t("all")}
      />
      <ul className="grid grid-cols-3 gap-3 sm:gap-6">
        {FAMILIES.filter(({ family }) => (counts.get(family) ?? 0) > 0).map(
          ({ family, image, position }) => (
            <li key={family}>
              <Link
                href={`/products?family=${familySlug(family)}`}
                className="group block h-full rounded-md"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-secondary sm:aspect-[16/10]">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 1536px) 480px, 33vw"
                    style={{ objectPosition: position }}
                    className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex items-start justify-between gap-1 pt-3 sm:gap-3 sm:pt-4">
                  <div>
                    <h3 className="text-sm font-medium leading-relaxed transition-colors duration-150 group-hover:text-primary sm:text-lg">
                      <span className="sm:hidden">
                        {tHeader(shortNames[family])}
                      </span>
                      <span className="hidden sm:inline">
                        {tFamily(family)}
                      </span>
                    </h3>
                    <p className="mt-0.5 text-[length:var(--text-xs)] tabular-nums text-muted-foreground">
                      {t("count", {
                        count: counts.get(family) ?? 0,
                        formatted: formatNumber(
                          counts.get(family) ?? 0,
                          locale === "ar" ? "ar" : "en",
                        ),
                      })}
                    </p>
                  </div>
                  <Onward className="mt-1 hidden text-muted-foreground group-hover:text-primary sm:block" />
                </div>
              </Link>
            </li>
          ),
        )}
      </ul>
      {shortcuts.length > 0 && (
        <nav
          aria-labelledby="lighting-type-heading"
          className="mt-8 border-t border-border pt-6"
        >
          <h3
            id="lighting-type-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("typeTitle")}
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-5 sm:grid-cols-4 sm:gap-x-6">
            {shortcuts.map((type) => {
              const copy = LIGHTING_TYPES.find((entry) => entry.id === type.id);
              return (
                <li key={`${type.family}:${type.id}`}>
                  <Link
                    href={`/products?family=${familySlug(type.family)}&type=${encodeURIComponent(type.id)}`}
                    className="group flex min-h-12 items-center gap-2.5 border-b border-border py-2.5 text-sm font-medium transition-colors duration-150 hover:text-primary"
                  >
                    <span>{copy ? pick(copy.name, locale) : type.name}</span>
                    <span className="ms-auto ps-1 text-xs font-normal tabular-nums text-muted-foreground">
                      {formatNumber(type.count, locale === "ar" ? "ar" : "en")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </section>
  );
}
