"use client"

import { addToCart } from "@/actions/cart";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import type { BulbChoice } from "@repo/catalog/bulb-pricing";
import type { LocalizedSpecGroup } from "@/lib/specs-view";
import { useProductDescription } from "@/lib/use-product-description";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatNumberWithConversion, formatPercent } from "@/lib/numbers";
import { applyRate, money, serializeMoney, subtractMoney } from "@repo/money";
import { useAuth } from "@/lib/auth-hooks";
import { useLocale, useTranslations } from "next-intl";
import { ProductImage as Image } from "@/components/product-image";
import { PLACEHOLDER_IMAGE } from "@/lib/product-images";
import { Loader2Icon, ShoppingBagIcon } from "lucide-react";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";

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
  quantity?: number;
  chandelierLightingType?: string;
  hNumber?: number;
  maximumWattage?: string;
  lampBase?: string;
  mainMaterial?: string;
  beamAngle?: string;
  translations?: {
    name?: string;
    description?: string;
  };
  /** The structured specs, localized — what the description is built from. */
  specGroups?: LocalizedSpecGroup[];
  /** The lighting type's name in this locale, for the opening clause. */
  lightingTypeName?: string;
  /** What the fixture is sold with, so the bulb clause states the real one. */
  bulbChoices?: BulbChoice[];
  specifications?: Array<{
    maximumWattage?: string;
    mainMaterial?: string;
    beamAngle?: string;
    lampBase?: string;
  }>;
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
  const [isPending, startTransition] = useTransition();
  const { isSignedIn } = useAuth();
  const locale = useLocale();
  const t = useTranslations("product-card");
  const tToast = useTranslations("toast");

  // Generated from this product's own specs — the same generator the
  // product page uses, so a card and the page it links to cannot say
  // different things about the same fixture.
  const description = useProductDescription(
    {
      family: product.sectionType,
      lightingTypeName: product.lightingTypeName,
      hNumber: product.hNumber,
      bulbChoices: product.bulbChoices,
      specGroups: product.specGroups,
    },
    "short"
  );

  const displayName = product.translations?.name || product.productName;

  const pricing = useMemo(() => {
    const onSale = money(product.discount).greaterThan(0);
    const saving = applyRate(product.price, product.discount);
    return {
      onSale,
      current: formatNumberWithConversion(serializeMoney(subtractMoney(product.price, saving)), locale),
      list: formatNumberWithConversion(product.price, locale),
      saving: formatNumberWithConversion(serializeMoney(saving), locale),
      rate: formatPercent(product.discount, locale),
    };
  }, [product.price, product.discount, locale]);

  // The family *slug*, not the enum. `sectionType` is "CHANDELIER" now, and
  // interpolating it built /category/mister-led/CHANDELIER/… — resolved,
  // because the route lowercases it, but a second URL for every product.
  const href = `/category/${product.brand}/${familySlug(product.sectionType)}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`;

  const [primary, hover] = product.productImages?.length
    ? [product.productImages[0]!, product.productImages[1]]
    : [PLACEHOLDER_IMAGE, undefined];

  const stock = product.quantity;
  const soldOut = stock === 0;

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error(tToast("signInRequired"));
      return;
    }
    startTransition(async () => {
      try {
        await addToCart(product.productId);
        toast.success(tToast("addToCartSuccess", { productName: displayName }));
      } catch (error) {
        console.error("Cart addition failed:", error);
        toast.error(tToast("addToCartError"));
      }
    });
  };

  return (
    <article className="group relative flex h-full flex-col">
      <figure className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <Image
          src={primary}
          alt={displayName}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
          className={cn(
            "object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]",
            hover && "group-hover:opacity-0",
          )}
        />
        {hover && (
          <Image
            src={hover}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            className="object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-out)] group-hover:opacity-100"
          />
        )}

        {pricing.onSale && (
          <span className="absolute start-3 top-3 rounded-md bg-primary px-2 py-1 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary-foreground shadow-[var(--shadow-e1)]">
            {t("off", { rate: pricing.rate })}
          </span>
        )}

        {/* Above the stretched link, so it adds to the bag rather than
            opening the product. Always visible on touch, where there is no
            hover to reveal it. */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isPending || soldOut}
          aria-label={t("addToCartNamed", { name: displayName })}
          className={cn(
            "absolute bottom-3 end-3 z-20 grid size-10 place-items-center rounded-full bg-background/95 text-foreground shadow-[var(--shadow-e2)] backdrop-blur",
            "transition-[transform,opacity,background-color] duration-[var(--dur-hover)] ease-[var(--ease-out)]",
            "hover:bg-primary hover:text-primary-foreground active:scale-95",
            "md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShoppingBagIcon className="size-4" aria-hidden />
          )}
        </button>
      </figure>

      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <h3 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-base)] font-semibold leading-snug">
          <Link
            href={href}
            prefetch
            // Stretches over the whole card: one target, one tab stop.
            className="after:absolute after:inset-0 after:z-10 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {displayName}
          </Link>
        </h3>

        {description && (
          <p className="line-clamp-2 text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
            {description}
          </p>
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
          ) : stock !== undefined && stock <= LOW_STOCK ? (
            <p className="text-[length:var(--text-xs)] text-muted-foreground">{t("fewLeft", { count: stock })}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
