"use client"

import { addToCart } from "@/actions/cart";
import NormalPrice from "@/components/normal-price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTextDirection } from "@/helpers/language";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/numbers";
import { money, type MoneyInput } from "@repo/money";
import { useAuth } from "@/lib/auth-hooks";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { toast } from "sonner";
import AddToCardIcon from "../add-to-card";
import DiscountPrice from "../discount-price";
import styles from "./product-card.module.css";

interface Product {
  productId: string;
  productName: string;
  brand: string;
  /** Serialized money (see @repo/money): a string, never a float. */
  price: string;
  productImages: string[];
  sectionType: string;
  spotlightType: string;
  /** Rate, not percent: 0.13 = 13%. */
  discount: string;
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

const safeString = (value: string | undefined, fallback: string = "N/A"): string => value ?? fallback;
const safeNumber = (value: number | undefined, fallback: number = 0): number => value ?? fallback;

export default function ProductCard({ product, locale }: ProductCardProps) {
  const [isPending, startTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isClicked, setIsClicked] = useState(false);
  const { isSignedIn } = useAuth();
  const t = useTranslations('product-card');
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toast');

  const { direction, isRTL } = useTextDirection(locale);

  const displayName = useMemo(() => {
    return product.translations?.name || product.productName;
  }, [product.translations?.name, product.productName]);

  const handleSlideChange = (index: number) => {
    setCurrentIndex(index);
  };

  const HandleClickedButtons = () => {
    setIsClicked(true);
  };

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error(tToast('signInRequired'));
      return;
    }

    startTransition(async () => {
      try {
        await addToCart(product.productId);
        toast.success(tToast('addToCartSuccess', { productName: displayName }));
      } catch (error) {
        console.error("Cart addition failed:", error);
        toast.error(tToast('addToCartError'));
      }
    });
  };

  function createLocalizedProductDescription(): string {
    if (product.translations?.description) {
      return product.translations.description ?? "";
    }

    const specs = product.specifications?.[0] || {};

    const mainMaterial = safeString(specs.mainMaterial || product.mainMaterial);
    const lampBase = safeString(specs.lampBase || product.lampBase);
    const beamAngle = safeString(specs.beamAngle || product.beamAngle);
    const maximumWattage = safeString(specs.maximumWattage || product.maximumWattage);
    const spotlightType = safeString(product.spotlightType);
    const hNumberCha = safeString(product.hNumber?.toString());

    const calculatedWattage = product.hNumber ? product.hNumber * 12 : 0;

    if (product.brand === "mister-led" && product.chandelierLightingType === "lamp") {
      return t('descriptions.chandelier', {
        material: mainMaterial,
        
        base: lampBase,
        wattage: calculatedWattage || safeString(maximumWattage),
        hNumber: hNumberCha
      });
    }

    if (product.brand === "balcom" &&
      (product.sectionType === "indoor" || product.sectionType === 'إضاءة داخلية')) {
      return t('descriptions.indoorSpotlight', {
        material: mainMaterial,
        beamAngle: beamAngle,
        wattage: maximumWattage,
      });
    }

    if (product.brand === "balcom" &&
      (product.sectionType === "outdoor" || product.sectionType === 'إضاءة خارجية')) {
      return t('descriptions.outdoorSpotlight', {
        spotlightType: spotlightType,
        wattage: maximumWattage,
      });
    }
    if (product.brand === "mister-led" && product.chandelierLightingType === "LED") {
      return t('descriptions.ledChandelier', {
        material: mainMaterial,
        wattage: maximumWattage,
      });
    }

    return t('descriptions.default', { productName: displayName });
  }

  return (
    <div className="relative p-2.5 select-none">
      <div>
        <div className={cn(
          "absolute top-[5%] z-10 px-[5px] py-[7px] flex items-center justify-center text-muted text-xs bg-[#676769] dark:bg-[#dad4d4]",
          isRTL
            ? "right-0 rounded-tr-none rounded-bl-[5px] rounded-tl-[5px] rounded-br-none"
            : "left-0 rounded-tl-none rounded-br-[5px] rounded-tr-[5px] rounded-bl-none"
        )}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 640 512"
          >
            <path d="M112 0C85.5 0 64 21.5 64 48V96H16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 272c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 48c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 240c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 208c8.8 0 16 7.2 16 16s-7.2 16-16 16H64V416c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H112zM544 237.3V256H416V160h50.7L544 237.3zM160 368a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm272 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0z" />
          </svg>
          <span className="ml-1.5 rtl:mr-1.5">
            {tCommon('fastShipping')}
          </span>
        </div>
        {money(product.discount).greaterThan(0) && (
          <div className={cn(
            "absolute top-[3px] z-10 px-[5px] py-[7px] flex items-center justify-center text-background text-xs",
            isRTL ? "left-[5px]" : "right-[5px]"
          )}>
            <Badge className="rounded-none text-sm" variant={"destructive"}>
              -{formatPercent(product.discount, locale ?? "en")}
            </Badge>
          </div>
        )}
      </div>
      <div className={styles.productContent}>
        <div className={styles.imageContainer} dir="ltr">
          {product?.productImages && (
            <Carousel
              className={styles.imageCarousel}
              showThumbs={false}
              showStatus={false}
              infiniteLoop={false}
              autoPlay={false}
              selectedItem={currentIndex}
              onChange={handleSlideChange}
              renderArrowPrev={(onClickHandlerLeft, hasPrev, label) =>
                hasPrev && (
                  <button onClick={onClickHandlerLeft} title={label} className="absolute left-1 bottom-[40%] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                    <svg className="h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" d="m15 19-7-7 7-7" />
                    </svg>
                  </button>
                )
              }
              renderArrowNext={(onClickHandlerRight, hasNext, label) =>
                hasNext && (
                  <button onClick={onClickHandlerRight} title={label} className="absolute right-1 bottom-[40%] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                    <svg className="h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                )
              }
            >
              {product.productImages.map((image, index) => (
                <div key={index} className="w-full h-full">
                  <Image
                    className="w-full overflow-x-hidden"
                    src={image}
                    alt={displayName}
                    width={500}
                    height={400}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </Carousel>
          )}
        </div>
        <div className="text-left rtl:text-right w-full">
          <h2 className="text-lg uppercase mt-2.5 text-foreground text-left rtl:text-right font-medium">
            {displayName}
          </h2>
          <p className="text-sm text-muted-foreground font-normal capitalize text-left rtl:text-right">
            {createLocalizedProductDescription()}
          </p>
          <div>
            <div className="font-medium text-lg mt-[5] mx-0 mb-0 text-left rtl:text-right">
              {money(product.discount).greaterThan(0) ? (
                <div className={cn(
                  "flex items-center",
                )}>
                  <span className="text-lg text-destructive font-semibold">
                    <DiscountPrice
                      price={product.price}
                      discount={product.discount}
                      sectionType={product.sectionType}
                    />
                  </span>
                  <s className={cn(
                    "text-muted-foreground italic text-base",
                    isRTL ? "mr-1.5" : "ml-1.5"
                  )}>
                    <NormalPrice
                      price={product.price}
                      sectionType={product.sectionType}
                    />
                  </s>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="italic text-base">
                    <NormalPrice
                      price={product.price}
                      sectionType={product.sectionType}
                    />
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={cn(styles.buttons, "flex pt-2.5 w-full gap-3 ")}>
          <span className="w-full">
            <Link
              prefetch={true}
              href={`/category/${product.brand}/${product.sectionType}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`}
              aria-label={t('moreDetails')}
              className={cn(
                "px-[25px] py-2.5 rounded-[3px] cursor-pointer h-10 flex justify-center items-center border border-black dark:border-gray-50 text-gray-950 dark:hover:text-gray-950 dark:text-gray-50 w-full hover:bg-gray-950 hover:text-gray-50 dark:hover:bg-gray-50 transition-colors",
                {
                  "dark:bg-gray-50 dark:text-primary-foreground bg-black text-gray-50":
                    isClicked,
                }
              )}
              onClick={HandleClickedButtons}
            >
              {t('moreDetails')}
            </Link>
          </span>
          <span className={styles.AddToCardContainer}>
            <Button
              onClick={handleAddToCart}
              disabled={isPending}
              className="flex rounded-[3px] justify-center items-center px-[9px] w-10 h-10 mx-0 bg-gray-950 hover:bg-gray-950 text-gray-50 dark:bg-gray-50 dark:text-gray-950 dark:hover:bg-gary-50/90"
              aria-label={t('addToCart')}
            >
              <AddToCardIcon Fill="currentColor" width={24} height={24} />
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}