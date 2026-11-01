import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { Link } from "@/i18n/navigation";
import { formatNumber, formatNumberWithConversion, formatPercent } from "@/lib/numbers";
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
  /** The average of this product's reviews, or null with none yet. */
  ratingAverage?: number | null;
  ratingCount?: number;
  /**
   * The short description, rendered on the server from the product's specs
   * by the same generator the product page uses (lib/card-description.ts).
   */
  description?: string;
}

interface ProductCardProps {
  product: Product;
  locale?: string;
}

/** Below this, the card says how many are left — scarcity that is real. */
const LOW_STOCK = 5;

/**
 * One product in a grid.
 *
 * What it replaced carried two badges — a discount, and "fast shipping" on
 * every one of 117 products whatever the product — an arrowed carousel
 * inside every card, a "more details" button beside an icon button, the
 * sale price in the destructive red the site uses for errors, prices in
 * italics, the title in capitals, hard-coded hex greys, and an h2 per card
 * so a listing page had dozens of them.
 *
 * Now the whole card is the link and the one action that is not a link —
 * add to bag — sits above it. The discount is stated as what the shopper
 * keeps ("save 202.80"), not only as a crossed-out number, in the one
 * accent the design uses. A second image fades in on hover where there is
 * one, which is the look a carousel was reaching for at a tenth of the
 * weight.
 */
export default function ProductCard({ product }: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations("product-card");

  const description = product.description;
  // Already the name in this locale (catalogueCards).
  const displayName = product.productName;

  const saving = applyRate(product.price, product.discount);
  const pricing = {
    onSale: money(product.discount).greaterThan(0),
    current: formatNumberWithConversion(serializeMoney(subtractMoney(product.price, saving)), locale),
    list: formatNumberWithConversion(product.price, locale),
    saving: formatNumberWithConversion(serializeMoney(saving), locale),
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
    <article className="group relative flex h-full flex-col">
      <figure className="relative aspect-square overflow-hidden rounded-sm">
        {/* Both images scale as one layer. Scaling only the first left the
            two at different sizes mid-fade, so the product ghosted. */}
        <div className="product-photo absolute inset-0 transform-gpu transition-transform duration-700 ease-[var(--ease-out)] will-change-transform backface-hidden group-hover:scale-[1.03]">
          <Image
            src={primary}
            alt={displayName}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            className="object-cover"
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
              className="object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-in-out)] group-hover:opacity-100"
            />
          )}
        </div>

        {pricing.onSale && (
          // A quiet label on the photograph, not a sticker: the solid gold
          // chip with a shadow was the loudest thing in every grid row.
          <span className="absolute start-3 top-3 rounded-sm bg-background/90 px-2 py-0.5 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary backdrop-blur-sm">
            {t("off", { rate: pricing.rate })}
          </span>
        )}

        <AddToCartButton productId={product.productId} displayName={displayName} soldOut={soldOut} />
      </figure>

      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <h3 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-base)] font-semibold leading-snug">
          <Link
            href={href}
            // The default: with partialPrefetching on, a card in view
            // prefetches only the product page's shell, not the whole page
            // and its data — ~40 full pages per home visit before.
            // Stretches over the whole card: one target, one tab stop.
            className="after:absolute after:inset-0 after:z-10 after:rounded-sm focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {displayName}
          </Link>
        </h3>

        {description && (
          <p className="line-clamp-2 text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {Boolean(product.ratingCount) && (
          <div className="flex items-center gap-1.5">
            <StarRating value={product.ratingAverage ?? 0} size="xs" />
            <span className="text-[length:var(--text-xs)] text-muted-foreground tabular-nums">
              {formatNumber(product.ratingCount!, locale === "ar" ? "ar" : "en")}
            </span>
          </div>
        )}

        <div className="mt-auto space-y-0.5 pt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span data-price className="text-[length:var(--text-lg)] font-semibold tabular-nums">
              {pricing.current}
            </span>
            {pricing.onSale && (
              <s className="text-[length:var(--text-sm)] tabular-nums text-muted-foreground">
                <span className="sr-only">{t("was")} </span>
                {pricing.list}
              </s>
            )}
          </div>
          {pricing.onSale && (
            <p className="text-[length:var(--text-xs)] font-medium tabular-nums text-primary">
              {t("save", { amount: pricing.saving })}
            </p>
          )}
          {soldOut ? (
            <p className="text-[length:var(--text-xs)] text-muted-foreground">{t("soldOut")}</p>
          ) : stock !== undefined && stock !== null && stock <= LOW_STOCK ? (
            <p className="text-[length:var(--text-xs)] text-muted-foreground">{t("fewLeft", { count: stock })}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
