"use client";

import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { RecordView } from "@/components/recently-viewed";
import type { ReviewsSection } from "@/lib/reviews.server";
import type { LocalizedProductData } from "@/lib/services/product.service";
import { specsByKey } from "@/lib/specs-view";
import { useProductDescription } from "@/lib/use-product-description";
import type { Configuration } from "@/types/products";
import type { ProductColorTemp, ProductIP } from "@repo/database";
import { useTranslations } from "next-intl";
import BuyBox from "./buy-box";
import ColorGuide from "./color-guide";
import ProductGallery from "./product-gallery";
import ProductGlance from "./product-glance";
import { ProductReviews } from "./product-reviews";
import ProductSpecs from "./product-specs";

/**
 * One product page, for every brand.
 *
 * There were two — a Balcom page and a chandelier page, 250 lines each and
 * mostly the same — picked between by a router component, each building its
 * own spec table from hard-coded labels, faking a whole Order object to
 * seed two buttons, and fading the entire page in with framer-motion on
 * every visit. What differs between the brands now comes from the product:
 * bulbs when it has arms, IP ratings when it is Balcom, the specs it has.
 */
export default function ProductDetail({
  product,
  configuration,
  locale,
  reviews,
  signedIn,
}: {
  product: LocalizedProductData;
  configuration?: Configuration;
  locale: string;
  reviews: ReviewsSection;
  signedIn: boolean;
}) {
  const t = useTranslations("pdp");
  const tReviews = useTranslations("reviews");
  const lightingTypeName =
    product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? undefined;

  const describable = {
    family: product.sectionType,
    lightingTypeName,
    hNumber: product.hNumber ?? undefined,
    bulbChoices: product.bulbChoices ?? [],
    specGroups: product.specGroups,
  };
  const shortDescription = useProductDescription(describable, "short");
  const fullDescription = useProductDescription(describable, "full");

  const colorTemperature = specsByKey(product.specGroups).colorTemperature;

  return (
    // Room at the bottom on a phone for the buy bar that rides along there.
    <article className="pb-40 md:pb-0">
      <RecordView productId={product.productId} />

      <div className={`${SECTION_FRAME} pt-4 lg:pt-6`}>
        {/* The gallery holds its place while the decisions scroll: on a wide
            screen a shopper comparing options can still see what they are
            buying. */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <ProductGallery images={product.productImages} name={product.productName} />
          </div>
          <BuyBox
            productName={product.productName}
            price={product.price}
            productId={product.productId}
            configId={configuration?.id}
            discount={product.discount}
            brand={product.brand}
            bulbChoices={product.bulbChoices ?? []}
            lightingTypeName={lightingTypeName}
            shortDescription={shortDescription}
            configuration={configuration}
            ip={(product.productIp as ProductIP | null) ?? undefined}
            baseIp={(product.productIp as ProductIP | null) ?? undefined}
            maxIP={product.maxIP ?? undefined}
            sectionType={product.sectionType}
            defaultColorTemp={(product.productColor as ProductColorTemp | null) ?? "warm"}
            stock={product.quantity}
            ratingAverage={product.ratingAverage}
            ratingCount={product.ratingCount}
          />
        </div>
      </div>

      {product.specGroups.length > 0 && (
        <section aria-labelledby="glance-heading" className={`${SECTION_FRAME} pt-16 lg:pt-24`}>
          <SectionHeading id="glance-heading" title={t("glance")} />
          <ProductGlance groups={product.specGroups} />
        </section>
      )}

      <div className={`${SECTION_FRAME} grid gap-12 pt-16 lg:grid-cols-12 lg:gap-14 lg:pt-20`}>
        <div className="space-y-10 lg:col-span-5">
          {fullDescription && (
            <section aria-labelledby="about-heading">
              <SectionHeading id="about-heading" title={t("about")} />
              <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">{fullDescription}</p>
            </section>
          )}
          <ColorGuide colorTemperature={colorTemperature} />
        </div>
        <section aria-labelledby="specs-heading" className="lg:col-span-7">
          <SectionHeading id="specs-heading" title={t("specs")} />
          <ProductSpecs
            groups={product.specGroups}
            hNumber={product.hNumber}
            locale={locale}
            armsLabel={t("arms")}
          />
        </section>
      </div>

      <section aria-labelledby="reviews-heading" id="reviews" className={`${SECTION_FRAME} pt-16 lg:pt-20`}>
        <SectionHeading id="reviews-heading" title={tReviews("title")} />
        <ProductReviews productId={product.productId} locale={locale} signedIn={signedIn} initial={reviews} />
      </section>
    </article>
  );
}
