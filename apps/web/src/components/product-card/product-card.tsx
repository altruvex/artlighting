import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/contact-links";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { Link } from "@/i18n/navigation";
import {
  formatNumber,
  formatNumberWithConversion,
  formatPercent,
} from "@/lib/numbers";
import { applyRate, money, serializeMoney, subtractMoney } from "@repo/money";
import { useLocale, useTranslations } from "next-intl";
import { ProductImage as Image } from "@/components/product/product-image";
import { StarRating } from "@/components/product/star-rating";
import { PLACEHOLDER_IMAGE } from "@/lib/product-images";
import { AddToCartButton } from "./add-to-cart-button";

interface Product {
  productId: string;
  productName: string;
  brand: string;
  /** Serialized money (see @repo/money): a string, never a float. */
  price: string;
  productImages: string[];
  sectionType: ProductFamily;
  spotlightType: string;
  /** Rate, not percent: 0.13 = 13%. */
  discount: string;
  /** What can be bought now; absent where a caller does not know it. */
  /** Units a customer may buy; null when the product is not tracked (never sold out). */
  quantity?: number | null;
  /** Priced by specification and quantity: no figure, no quick add. */
  madeToOrder?: boolean;
  /** The average of this product's reviews, or null with none yet. */
  ratingAverage?: number | null;
  ratingCount?: number;
  /**
   * The short description, rendered on the server from the product's specs
   * by the same generator the product page uses (lib/card-description.ts).
   */
  description?: string;
  lightingTypeName?: string;
}

interface ProductCardProps {
  product: Product;
  locale?: string;
  /**
   * Above the fold: load the photo now, at high priority, instead of
   * lazily. Only the first row or so of a page — every eager image competes
   * with the others for the same bandwidth.
   */
  eager?: boolean;
}

/** Below this, the card says how many are left — scarcity that is real. */
const LOW_STOCK = 5;

/** A full-size product photo, clear pricing and one purchase action. */
export default function ProductCard({
  product,
  eager = false,
}: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations("product-card");

  // Already the name in this locale (catalogueCards).
  const displayName = product.productName;

  const madeToOrder = product.madeToOrder === true;
  const saving = applyRate(product.price, product.discount);
  const pricing = {
    onSale: !madeToOrder && money(product.discount).greaterThan(0),
    current: formatNumberWithConversion(
      serializeMoney(subtractMoney(product.price, saving)),
      locale,
    ),
    list: formatNumberWithConversion(product.price, locale),
    rate: formatPercent(product.discount, locale),
  };

  // The family *slug*, not the enum. `sectionType` is "CHANDELIER" now, and
  // interpolating it built /category/mister-led/CHANDELIER/… — resolved,
  // because the route lowercases it, but a second URL for every product.
  const href = `/category/${product.brand}/${familySlug(product.sectionType)}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`;

  const [primary, hover] = product.productImages?.length
    ? [product.productImages[0]!, product.productImages[1]]
    : [PLACEHOLDER_IMAGE, undefined];

  const stock = product.quantity;
  const soldOut = stock === 0;

  return (
    <article className="group relative flex h-full min-w-0 flex-col">
      <figure className="relative aspect-square overflow-hidden rounded-md bg-secondary/50">
        {/* Both images scale as one layer. Scaling only the first left the
            two at different sizes mid-fade, so the product ghosted. */}
        <div className="product-photo absolute inset-0 transition-transform duration-200 ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.02]">
          <Image
            src={primary}
            alt={displayName}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            // Next 16: `priority` is deprecated, and `preload` is for a single
            // LCP image — a grid row is several, so eager + high priority.
            {...(eager
              ? ({ loading: "eager", fetchPriority: "high" } as const)
              : {})}
            className="object-contain"
          />
          {hover && (
            // Only the second image fades, over a first that stays opaque.
            // Fading both at once let the grey figure show through halfway.
            <Image
              src={hover}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
              className="object-contain opacity-0 transition-opacity duration-200 ease-[var(--ease-out)] group-hover:opacity-100"
            />
          )}
        </div>

        {pricing.onSale && (
          // A quiet label on the photograph, not a sticker: the solid gold
          // chip with a shadow was the loudest thing in every grid row.
          <span className="absolute start-3 top-3 rounded-sm bg-background px-2 py-0.5 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary">
            {t("off", { rate: pricing.rate })}
          </span>
        )}
      </figure>

      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <p className="text-[length:var(--text-xs)] text-muted-foreground">
          {product.lightingTypeName ?? product.brand}
        </p>
        <h3 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-base)] font-semibold leading-snug">
          <Link
            href={href}
            // The default: with partialPrefetching on, a card in view
            // prefetches only the product page's shell, not the whole page
            // and its data — ~40 full pages per home visit before.
            // Stretches over the whole card: one target, one tab stop.
            className="after:absolute after:inset-0 after:z-10 after:rounded-sm focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            <bdi className="break-words">{displayName}</bdi>
          </Link>
        </h3>

        {Boolean(product.ratingCount) && (
          <div className="flex items-center gap-1.5">
            <StarRating value={product.ratingAverage ?? 0} size="xs" />
            <span className="text-[length:var(--text-xs)] text-muted-foreground tabular-nums">
              {formatNumber(
                product.ratingCount!,
                locale === "ar" ? "ar" : "en",
              )}
            </span>
          </div>
        )}

        <div className="mt-auto space-y-0.5 pt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {madeToOrder ? (
              // Said as an answer, not left as a gap: the same weight and
              // size as a figure, in the foreground colour — a muted grey
              // read as a price that had failed to load.
              <span className="text-[length:var(--text-base)] font-semibold text-foreground">
                {t("priceOnRequest")}
              </span>
            ) : (
              <bdi
                data-price
                className="text-[length:var(--text-lg)] font-semibold tabular-nums"
              >
                {pricing.current}
              </bdi>
            )}
            {pricing.onSale && (
              <s className="text-[length:var(--text-sm)] tabular-nums text-muted-foreground">
                <span className="sr-only">{t("was")} </span>
                <bdi>{pricing.list}</bdi>
              </s>
            )}
          </div>
          {!soldOut &&
          stock !== undefined &&
          stock !== null &&
          stock <= LOW_STOCK ? (
            <p className="text-[length:var(--text-xs)] text-muted-foreground">
              {t("fewLeft", { count: stock })}
            </p>
          ) : null}
        </div>

        {madeToOrder ? (
          <a
            href={whatsappLink(t("quoteMessage", { name: displayName }))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("askForPriceNamed", { name: displayName })}
            className="relative z-20 mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-2 text-sm font-medium transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            <span>{t("askForPrice")}</span>
          </a>
        ) : (
          <div className="mt-2">
            <AddToCartButton
              productId={product.productId}
              displayName={displayName}
              soldOut={soldOut}
            />
          </div>
        )}
      </div>
    </article>
  );
}
