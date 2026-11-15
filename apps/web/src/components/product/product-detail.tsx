"use client";

import { productPersonal } from "@/actions/configuration";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { RecordView } from "@/components/recently-viewed";
import { useAuth } from "@/lib/auth-hooks";
import { hasGuestConfigHint } from "./guest-config-hint";
import type { ProductPersonalState } from "@/lib/product-personal.server";
import type { ReviewsSection } from "@/lib/reviews.server";
import type { LocalizedProductData } from "@/lib/services/product.service";
import { specsByKey } from "@/lib/specs-view";
import { useProductDescription } from "@/lib/use-product-description";
import type { ProductColorTemp, ProductIP } from "@repo/database";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import BuyBox from "./buy-box";
import ColorGuide from "./color-guide";
import ProductGallery from "./product-gallery";
import ProductGlance from "./product-glance";
import { ProductReviews } from "./product-reviews";
import ProductSpecs from "./product-specs";
import { StarRating, ratingLabel } from "./star-rating";
import { formatNumber } from "@/lib/numbers";

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
  locale,
  reviews,
}: {
  product: LocalizedProductData;
  locale: string;
  reviews: ReviewsSection;
}) {
  // Who is looking — their saved options and their own review — asked for
  // once the prerendered page is on screen; null until then.
  // A signed-out visitor with no saved guest configuration has neither, so
  // it is not asked for: that was a server call on every anonymous view.
  const [personal, setPersonal] = useState<ProductPersonalState | null>(null);
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !hasGuestConfigHint()) return;
    let live = true;
    productPersonal(product.productId)
      .then((state) => {
        if (live) setPersonal(state);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [product.productId, isLoaded, isSignedIn]);

  const t = useTranslations("pdp");
  const tReviews = useTranslations("reviews");
  const lightingTypeName =
    product.lightingtype?.translations?.[0]?.name ??
    product.lightingtype?.name ??
    undefined;

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
  const hasAbout = Boolean(
    fullDescription && fullDescription !== shortDescription,
  );
  const hasOverview = hasAbout || Boolean(colorTemperature);
  const hasSpecs =
    product.specGroups.some((group) => group.items.length > 0) ||
    Boolean(product.hNumber);

  return (
    // Room at the bottom on a phone for the one-row buy bar that shows while
    // the in-page buttons are scrolled away (it covers the end of the page).
    <article className="pb-24 md:pb-0">
      <RecordView productId={product.productId} />

      <div className={`${SECTION_FRAME} pt-4 lg:pt-6`}>
        <div className="grid items-start gap-x-10 gap-y-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-14">
          <header className="min-w-0 space-y-2 md:col-start-2 md:row-start-1">
            {lightingTypeName && (
              <p className="text-sm text-muted-foreground">
                {lightingTypeName}
              </p>
            )}
            <h1 className="break-words font-[family-name:var(--font-display-face)] text-2xl font-medium leading-snug">
              <bdi>{product.productName}</bdi>
            </h1>
            {shortDescription && (
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {shortDescription}
              </p>
            )}
            {product.ratingCount > 0 && product.ratingAverage !== null && (
              <a
                href="#reviews"
                className="inline-flex min-h-10 items-center gap-2 text-sm hover:text-primary"
              >
                <StarRating value={product.ratingAverage} />
                <span className="sr-only">
                  {ratingLabel(
                    product.ratingAverage,
                    product.ratingCount,
                    locale,
                  )}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  {formatNumber(
                    product.ratingCount,
                    locale === "ar" ? "ar" : "en",
                  )}
                </span>
              </a>
            )}
          </header>
          <div className="min-w-0 md:sticky md:top-[calc(var(--store-header-height,8rem)+1rem)] md:col-start-1 md:row-start-1 md:row-span-2">
            <ProductGallery
              images={product.productImages}
              name={product.productName}
            />
          </div>
          <div className="min-w-0 md:col-start-2 md:row-start-2">
            <BuyBox
              productName={product.productName}
              price={product.price}
              productId={product.productId}
              discount={product.discount}
              brand={product.brand}
              bulbChoices={product.bulbChoices ?? []}
              personal={personal}
              ip={(product.productIp as ProductIP | null) ?? undefined}
              baseIp={(product.productIp as ProductIP | null) ?? undefined}
              maxIP={product.maxIP ?? undefined}
              sectionType={product.sectionType}
              defaultColorTemp={
                (product.productColor as ProductColorTemp | null) ?? "warm"
              }
              stock={product.quantity}
              madeToOrder={product.madeToOrder}
            />
          </div>
        </div>
      </div>

      <ProductGlance groups={product.specGroups} title={t("glance")} />

      {(hasOverview || hasSpecs) && (
        <div
          className={`${SECTION_FRAME} grid gap-8 pt-10 lg:grid-cols-12 lg:gap-12 lg:pt-14`}
        >
          {hasOverview && (
            <div
              className={
                hasSpecs
                  ? "space-y-8 lg:col-span-5"
                  : "space-y-8 lg:col-span-12"
              }
            >
              {hasAbout && (
                <section aria-labelledby="about-heading">
                  <SectionHeading id="about-heading" title={t("about")} />
                  <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
                    {fullDescription}
                  </p>
                </section>
              )}
              <ColorGuide colorTemperature={colorTemperature} />
            </div>
          )}
          {hasSpecs && (
            <section
              aria-labelledby="specs-heading"
              className={hasOverview ? "lg:col-span-7" : "lg:col-span-12"}
            >
              <SectionHeading id="specs-heading" title={t("specs")} />
              <ProductSpecs
                groups={product.specGroups}
                hNumber={product.hNumber}
                locale={locale}
                armsLabel={t("arms")}
              />
            </section>
          )}
        </div>
      )}

      <section
        aria-labelledby="reviews-heading"
        id="reviews"
        className={`${SECTION_FRAME} scroll-mt-[calc(var(--store-header-height,8rem)+1rem)] pt-10 lg:pt-14`}
      >
        <SectionHeading id="reviews-heading" title={tReviews("title")} />
        <ProductReviews
          productId={product.productId}
          locale={locale}
          initial={reviews}
          personal={personal}
        />
      </section>
    </article>
  );
}
