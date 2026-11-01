// apps/web/src/app/[locale]/(main)/(configure)/preview/[ProductId]/preview.tsx
"use client";

import { CHECKOUT_GRID, CheckoutHeader } from "@/components/order/checkout-header";
import { Onward } from "@/components/editorial/arrow";
import LoginModal from "@/components/login-model";
import NormalPrice from "@/components/price/normal-price";
import ProductGallery from "@/components/product/product-gallery";
import { Button } from "@repo/ui/components/button";
import { useRouter } from "@/i18n/navigation";
import { useUser } from "@/lib/auth-hooks";
// The serialized view model, not Prisma's row type: money reaches a
// Client Component as a string (see @repo/money).
import type { Configuration } from "@/types/products";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createOrder } from "./action";
import { orderErrorText } from "@/components/order/order-error";
import { PricingService } from "@/lib/pricing.server";
import { applyRate, serializeMoney, subtractMoney } from "@repo/money";

/** The screen's whole view of the product; page.tsx fills in nothing else. */
export interface PreviewProduct {
  productName: string;
  productImages: string[];
  categoryName?: string;
  lightingTypeName?: string;
  luminousFlux?: string;
  colorTemperature?: string;
  beamAngle?: string;
  cri?: string;
  mainMaterial?: string;
  lifeTime?: string;
}

interface PreviewProps {
  configuration: Configuration;
  productId: string;
  product: PreviewProduct;
}

export default function Preview({
  configuration: finalConfiguration,
  productId: actualProductId,
  product: finalProduct,
}: PreviewProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('preview');
  const tColor = useTranslations('colorTemperature');
  const tOrder = useTranslations('order');

  const [authState, setAuthState] = useState({
    isAuthChecked: false,
    canProceedWithOrder: false
  });

  const priceCalculations = useMemo(
    () =>
      PricingService.calculateOrderPricing(
        finalConfiguration.configPrice || 0,
        finalConfiguration.totalPrice || 0,
        finalConfiguration.quantity || 1,
        finalConfiguration.discount || 0
      ),
    [finalConfiguration]
  );

  useEffect(() => {
    if (isLoaded) {
      setAuthState({
        isAuthChecked: true,
        canProceedWithOrder: isSignedIn && !!user
      });
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    try {
      localStorage.setItem("configurationId", finalConfiguration.id);
    } catch (error) {
      console.error("Error storing configuration ID:", error);
    }
  }, [finalConfiguration.id]);

  const { mutate: CreateOrderSession, isPending } = useMutation({
    mutationKey: ["get-order-session"],
    mutationFn: createOrder,
    onMutate: () => {
      if (!authState.canProceedWithOrder) {
        throw new Error("Authentication required");
      }
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(orderErrorText(tOrder as never, locale, result));
        return;
      }
      const { orderId } = result;
      try {
        localStorage.removeItem("configurationId");
        localStorage.removeItem(`quantity-${actualProductId}`);
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }
      router.push(`/confirm/?orderId=${orderId}`);
    },
    onError: (error) => {
      if (error.message.includes("logged in")) {
        toast.error(t('authError'));
        setIsLoginModalOpen(true);
      } else {
        toast.error(t('generalError'));
      }
    },
  });

  const handleConfirm = useCallback(async () => {
    if (!isLoaded) {
      toast.error(t('waitAuth'));
      return;
    }

    if (!authState.canProceedWithOrder) {
      setIsLoginModalOpen(true);
      return;
    }

    CreateOrderSession({
      configId: finalConfiguration.id,
      quantity: priceCalculations.quantity
    });
  }, [isLoaded, authState, finalConfiguration, priceCalculations, CreateOrderSession, t]);

  if (!authState.isAuthChecked) {
    return (
      <div role="status" className="flex min-h-[50dvh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {t('loadingTitle')}
      </div>
    );
  }

  // The configuration's stored total is the undiscounted price — dividing
  // it by the quantity showed a "discounted" unit price equal to the full
  // one. What the order will charge is the price less the discount.
  const unitAfterDiscount = serializeMoney(
    subtractMoney(priceCalculations.configPrice, applyRate(priceCalculations.configPrice, priceCalculations.discount)),
  );
  const totalAfterDiscount = serializeMoney(subtractMoney(priceCalculations.subtotal, priceCalculations.discountAmount));

  // The figures the product page leads with, from the catalogue — in place
  // of three marketing sentences with a spec value dropped into each.
  const figures = [
    { key: "luminousFlux", value: finalProduct.luminousFlux },
    { key: "colorTemperature", value: finalProduct.colorTemperature },
    { key: "beamAngle", value: finalProduct.beamAngle },
    { key: "cri", value: finalProduct.cri },
    { key: "mainMaterial", value: finalProduct.mainMaterial },
    { key: "lifeTime", value: finalProduct.lifeTime },
  ].filter((figure): figure is { key: string; value: string } => Boolean(figure.value?.trim()));

  const choices = [
    finalConfiguration.colorTemp ? { label: t('choiceColor'), value: tColor(`${finalConfiguration.colorTemp}.title`) } : null,
    finalConfiguration.productIp ? { label: t('choiceIp'), value: finalConfiguration.productIp.replace(/^IP/, "IP ") } : null,
  ].filter((choice): choice is { label: string; value: string } => choice !== null);

  return (
    <>
      <LoginModal isOpen={isLoginModalOpen} setIsOpen={setIsLoginModalOpen} />
      <CheckoutHeader eyebrow={t('eyebrow')} title={t('title')} lede={<p>{t('lede')}</p>} />
      <div className={CHECKOUT_GRID}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            {finalProduct.productImages && finalProduct.productImages.length > 0 ? (
              <ProductGallery images={finalProduct.productImages} name={finalProduct.productName} />
            ) : (
              <div className="grid aspect-square place-items-center rounded-sm bg-muted text-muted-foreground">
                {t('noImagesAvailable')}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-8">
            <div>
              {finalProduct.lightingTypeName && <p className="eyebrow">{finalProduct.lightingTypeName}</p>}
              <h2 className="mt-2 text-[length:var(--text-2xl)] font-medium ltr:tracking-tight">{finalProduct.productName}</h2>
              {finalProduct.categoryName && <p className="mt-1 text-muted-foreground">{finalProduct.categoryName}</p>}
            </div>

            {choices.length > 0 && (
              <section aria-labelledby="choices-heading">
                <h3 id="choices-heading" className="eyebrow pb-3">{t('choices')}</h3>
                <dl className="divide-y divide-border border-y border-border text-[length:var(--text-sm)]">
                  {choices.map((choice) => (
                    <div key={choice.label} className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">{choice.label}</dt>
                      <dd className="text-end font-medium" dir="auto">{choice.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {figures.length > 0 && (
              <section aria-labelledby="figures-heading">
                <h3 id="figures-heading" className="eyebrow pb-3">{t('figures')}</h3>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
                  {figures.map((figure) => (
                    <div key={figure.key} className="bg-background p-4">
                      <dt className="text-[length:var(--text-xs)] text-muted-foreground">{t(`spec.${figure.key}`)}</dt>
                      <dd className="mt-1.5 font-semibold tabular-nums" dir="auto">{figure.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>

        <section aria-labelledby="preview-summary" className="rounded-md border border-border bg-card/40 p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 id="preview-summary" className="eyebrow mb-4">{t('summary')}</h2>
          <dl className="space-y-3 text-[length:var(--text-sm)]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{t('pricePerItem')}</dt>
              <dd className="text-end tabular-nums">
                {priceCalculations.hasDiscount && (
                  <s className="me-2 text-muted-foreground"><NormalPrice price={priceCalculations.configPrice} /></s>
                )}
                <NormalPrice price={unitAfterDiscount} />
              </dd>
            </div>
            {priceCalculations.hasDiscount && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t('discountAmount')}</dt>
                <dd className="font-medium tabular-nums text-primary" dir="ltr">−{priceCalculations.discountPercentage}%</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{t('quantity')}</dt>
              <dd className="text-end tabular-nums">{priceCalculations.quantity}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <dt className="text-[length:var(--text-base)] font-semibold">{t('totalPrice')}</dt>
              <dd className="text-end font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold tabular-nums">
                <NormalPrice price={totalAfterDiscount} />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[length:var(--text-xs)] text-muted-foreground">{t('deliveryNote')}</p>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !authState.isAuthChecked}
            className="mt-6 h-12 w-full text-base font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                {t('confirmingOrder')}
              </>
            ) : (
              <>
                {t('confirmOrder')}
                <Onward />
              </>
            )}
          </Button>
        </section>
      </div>
    </>
  );
}
