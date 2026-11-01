import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { newCollectionProducts } from "@/constants";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { COLLECTION_HREF } from "./collection-links";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "collection" });
  return constructMetadata({ locale, path: "/new-collection", title: t("metaTitle"), description: t("lede") });
}

/**
 * The newest product lines, each leading into the shop filtered to it.
 * It was a client component that faded in and linked each tile to a
 * detail page that could never find its collection.
 */
export default async function NewCollectionPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "collection" });
  const tRoot = await getTranslations({ locale });

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("title") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("lede")}</p>} />
      <section aria-label={t("title")} className={`${SECTION_FRAME} pb-20 lg:pb-28`}>
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-3">
          {newCollectionProducts.map((product) => (
            <li key={product.id}>
              <Link href={COLLECTION_HREF[product.id] ?? "/products"} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted">
                  <Image
                    src={product.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                  <h2 className="text-[length:var(--text-xl)] font-medium transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                    {tRoot(product.nameKey)}
                  </h2>
                  <Onward className="text-muted-foreground transition-transform duration-[var(--dur-hover)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {/* The one company page that ended on its last tile, with no way on. */}
      <ClosingCta locale={locale} />
    </>
  );
}
