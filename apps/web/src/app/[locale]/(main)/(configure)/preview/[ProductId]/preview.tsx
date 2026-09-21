// apps/web/src/app/[locale]/(main)/(configure)/preview/[ProductId]/preview.tsx
"use client";

import { Container } from "@/components/container";
import type { ProductFamily } from "@repo/catalog/families";
import type { MoneyInput } from "@repo/money";
import LoginModal from "@/components/login-model";
import NormalPrice from "@/components/normal-price";
import ProductImages from "@/components/product-images";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "@/i18n/navigation";
import { useUser } from "@/lib/auth-hooks";
// The serialized view model, not Prisma's row type: money reaches a
// Client Component as a string (see @repo/money).
import type { Configuration } from "@/types/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createOrder } from "./action";
import { PricingService } from "@/lib/pricing.server";

export interface ProductWithSpecs {
  id: string;
  productId: string;
  productName: string;
  price: string;
  productImages: string[];
  discount: string;
  sectionType: ProductFamily;
  spotlightType: string;
  brand: string;
  productColor: string;
  productIp: string;
  productChandLamp: string;
  maxIP?: number;
  luminousFlux?: string;
  mainMaterial?: string;
  beamAngle?: string;
  colorTemperature?: string;
  lifeTime?: string;
  energySaving?: string;
  cri?: string;
  brandOfLed?: string;
  electrical?: string;
  input?: string;
  finish?: string;
  lampBase?: string;
  hNumber?: number;
  chandelierLightingType?: string;
  specification?: any;
  localizedSpecs?: any;
  description?: string;
  categoryName?: string;
  lightingTypeName?: string;
}

const fetchProduct = async (productId: string, locale: string): Promise<ProductWithSpecs> => {
  const response = await fetch(`/api/products/${productId}?locale=${locale}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.status}`);
  }

  return response.json();
};

const fetchConfiguration = async (productId: string): Promise<Configuration> => {
  const response = await fetch(`/api/configurations/by-products/${productId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch configuration: ${response.status}`);
  }

  return response.json();
};

interface PreviewProps {
  configuration?: Configuration;
  discount?: string;
  productId: string;
  product?: ProductWithSpecs;
  locale: string;
}

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
    },
  },
} as const;

export default function Preview({
  configuration: initialConfiguration,
  discount: initialDiscount,
  productId,
  product: initialProduct,
  locale: initialLocale,
}: PreviewProps) {
  const [configuration, setConfiguration] = useState<Configuration | undefined>(initialConfiguration);
  const { ProductId } = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('preview');

  const [authState, setAuthState] = useState({
    isAuthChecked: false,
    canProceedWithOrder: false
  });

  const actualProductId = productId || (ProductId as string);

  const { data: product, isLoading: isProductLoading, isError: isProductError, refetch: refetchProduct } = useQuery<ProductWithSpecs>({
    queryKey: ["product", actualProductId, locale],
    queryFn: () => fetchProduct(actualProductId, locale),
    enabled: !!actualProductId && !initialProduct,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedConfiguration, isLoading: isConfigLoading, isError: isConfigError, refetch: refetchConfiguration } = useQuery<Configuration>({
    queryKey: ["configuration", actualProductId],
    queryFn: () => fetchConfiguration(actualProductId),
    enabled: !!actualProductId && !initialConfiguration,
    retry: 3,
  });

  const finalProduct = initialProduct || product;
  const finalConfiguration = initialConfiguration || configuration || fetchedConfiguration;

  const priceCalculations = useMemo(() => {
    if (!finalConfiguration) {
      return PricingService.calculateOrderPricing(0, 0, 1, 0);
    }

    return PricingService.calculateOrderPricing(
      finalConfiguration.configPrice || 0,
      finalConfiguration.totalPrice || 0,
      finalConfiguration.quantity || 1,
      finalConfiguration.discount || 0
    );
  }, [finalConfiguration]);

  useEffect(() => {
    if (isLoaded) {
      setAuthState({
        isAuthChecked: true,
        canProceedWithOrder: isSignedIn && !!user
      });
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (finalConfiguration) {
      try {
        localStorage.setItem("configurationId", finalConfiguration.id);
        setConfiguration(finalConfiguration);
      } catch (error) {
        console.error("Error storing configuration ID:", error);
      }
    }
  }, [finalConfiguration]);

  const { mutate: CreateOrderSession, isPending } = useMutation({
    mutationKey: ["get-order-session"],
    mutationFn: createOrder,
    onMutate: () => {
      if (!authState.canProceedWithOrder) {
        throw new Error("Authentication required");
      }
    },
    onSuccess: ({ userId, orderId }) => {
      try {
        localStorage.removeItem("configurationId");
        localStorage.removeItem(`quantity-${actualProductId}`);
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }
      router.push(`/confirm/?orderId=${orderId}&userId=${userId}`);
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

    if (!finalConfiguration) {
      toast.error(t('configMissing'));
      return;
    }

    CreateOrderSession({
      configId: finalConfiguration.id,
      quantity: priceCalculations.quantity
    });
  }, [isLoaded, authState, finalConfiguration, priceCalculations, CreateOrderSession, t]);

  const handleRetry = () => {
    refetchProduct();
    refetchConfiguration();
  };

  const isLoading = !authState.isAuthChecked || isProductLoading || isConfigLoading;

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <h3 className="font-semibold text-2xl">{t('loadingTitle')}</h3>
          <p>{t('loadingSubtitle')}</p>
        </div>
      </div>
    );
  }

  if (isProductError || isConfigError || !finalProduct || !finalConfiguration) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="font-semibold text-2xl">{t('errorTitle')}</h3>
          <p>{t('errorSubtitle')}</p>
          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline">{t('retryButton')}</Button>
            <Button onClick={() => window.location.reload()}>{t('refreshButton')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Container>
        <motion.div initial="hidden" animate="visible" variants={pageVariants} className="py-12">
          <h1 className="lg:text-3xl md:text-2xl text-xl font-bold sm:mb-8">
            {t('title')}
          </h1>
          <LoginModal isOpen={isLoginModalOpen} setIsOpen={setIsLoginModalOpen} />
          <div className="flex flex-col lg:flex-row lg:gap-x-12 gap-x-0">
            <div className="lg:w-[40%] md:w-[50%] mb-0">
              {finalProduct.productImages && finalProduct.productImages.length > 0 ? (
                <ProductImages productImages={finalProduct.productImages} />
              ) : (
                <div className="w-full h-[450px] flex items-center justify-center bg-muted rounded-lg">
                  <p>{t('noImagesAvailable')}</p>
                </div>
              )}
            </div>
            <div>
              <div className="h-150 w-full col-span-full lg:col-span-1 flex flex-col">
                <ScrollArea className="relative flex-1 overflow-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="p-[18px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="-ml-4">
                      <h2 className="md:text-2xl text-xl mt-6 font-bold text-primary">
                        {finalProduct.productName}
                      </h2>
                      <div className="mt-3 flex items-center gap-1.5 text-base">
                        <Check className="h-4 w-4 text-primary" />
                        {t('inStock')}
                      </div>
                    </div>
                    <div className="sm:col-span-12 md:col-span-9 text-base mb-6">
                      <div className="grid grid-cols-1 border-b border-border py-4 sm:py-2 md:py-4">
                        <p className="font-bold md:text-xl text-lg -ml-4">{t('highlights')}</p>
                        <ol className="mt-3 list-disc space-y-1">
                          <li className="md:text-lg text-base">
                            <p className="inline tracking-wide">
                              <strong>{t('highlights-preview.ledsTitle')}</strong>{" "}
                              {t('highlights-preview.ledsDescription', { luminousFlux: finalProduct.luminousFlux || t('highlights-preview.ledsDescriptionDefault') })}
                            </p>
                          </li>
                          <li className="md:text-lg text-base">
                            <p className="inline tracking-wide">
                              <strong>{t('highlights-preview.durableTitle')}</strong>{" "}
                              {t('highlights-preview.durableDescription', { material: finalProduct.mainMaterial || t('highlights-preview.durableDescriptionDefault') })}
                            </p>
                          </li>
                          <li className="md:text-lg text-base">
                            <p className="inline tracking-wide">
                              <strong>{t('highlights-preview.adaptableTitle')}</strong>{" "}
                              {t('highlights-preview.adaptableDescription')}
                            </p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    <div className="mt-8">
                      <div className="py-4 sm:py-6 sm:rounded-lg">
                        <div className="flow-root text-lg">
                          {priceCalculations.hasDiscount ? (
                            <>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p className="md:text-lg text-base">{t('pricePerItem')}</p>
                                <s className="text-muted-foreground md:text-lg text-base">
                                  <NormalPrice price={priceCalculations.configPrice} />
                                </s>
                              </div>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p className="md:text-lg text-base text-center">{t('quantity')}</p>
                                <p className="md:text-lg text-base">{priceCalculations.quantity}</p>
                              </div>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p className="md:text-lg text-base">{t('discountAmount')}</p>
                                <span className="text-primary font-semibold md:text-lg text-base">
                                  {priceCalculations.discountPercentage}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p className="md:text-lg text-base">{t('priceAfterDiscount')}</p>
                                <span className="md:text-lg text-base text-destructive font-semibold">
                                  <NormalPrice price={priceCalculations.totalPrice} />
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p>{t('pricePerItem')}</p>
                                <p><NormalPrice price={priceCalculations.unitPriceAfterDiscount} /></p>
                              </div>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p>{t('quantity')}</p>
                                <p>{priceCalculations.quantity}</p>
                              </div>
                              <div className="flex items-center justify-between py-1 mt-2">
                                <p>{t('totalPrice')}</p>
                                <p><NormalPrice price={priceCalculations.totalPrice} /></p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              <div className="mt-8 flex md:justify-end justify-center pb-12">
                <Button
                  onClick={handleConfirm}
                  disabled={isPending || !authState.isAuthChecked}
                  className="sm:h-[52px] h-10 sm:px-10 px-8 bg-primary text-primary-foreground sm:text-lg text-base"
                >
                  {isPending ? t('confirmingOrder') : t('confirmOrder')}
                  <ArrowRight className="sm:h-[18px] sm:w-[18px] h-4 w-4 ml-1.5 inline" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}