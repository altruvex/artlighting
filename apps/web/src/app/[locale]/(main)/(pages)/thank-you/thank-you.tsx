"use client";
import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import type { MoneyInput } from "@repo/money";
import { Container } from "@/components/container";
import NormalPrice from "@/components/normal-price";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PRODUCT_TEMP_LABEL_MAP } from "@/config/config";
import { Link, useRouter } from "@/i18n/navigation";
import { calculateEstimatedDeliveryDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { isProductChandLamp } from "@/lib/utils";
import type { Configuration, Order, Product, ProductSpecification, ShippingAddress, SupportedLanguage } from "@/types/products";
import { ProductColorTemp } from "@/types/products";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "react-responsive-carousel/lib/styles/carousel.min.css";

type OrderWithRelations = Order & {
  product: Product & {
    specifications: ProductSpecification[]
  }
  shippingAddress: ShippingAddress | null
  configuration: Configuration | null
  /** Named for the locale the receipt is rendered in. */
  bulb?: { wattage: number; translations: { name: string }[] } | null
  discount: string | null
}

export default function ThankYou({
  discount,
  initialOrder
}: {
  discount: string,
  initialOrder: OrderWithRelations
}) {
  // Animation variants for Framer Motion
  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.3,
      },
    },
  };

  // Hooks for translations, routing, and locale
  const t = useTranslations('thankYou');
  const tLamp = useTranslations('ProductChandLampButtons');
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const estimatedDeliveryDate = calculateEstimatedDeliveryDate(isRTL ? "ar" : "en");
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [isValidatingOrder, setIsValidatingOrder] = useState(true);

  // Fetch order data using React Query, with initial data provided
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["get-order-completed-status", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Accept-Language': locale,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || "Failed to fetch order status");
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      return response.json();
    },
    enabled: !!orderId && !initialOrder, // Only fetch if orderId exists and no initialOrder is provided
    retry: 1,
    initialData: initialOrder,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const priceCalculations = useMemo(() => {
    if (!order) return null

    const configPrice = order.configuration?.configPrice || order.configPrice || 0
    const totalPrice = order.configuration?.totalPrice || order.totalPrice || 0
    const quantity = order.configuration?.quantity || order.quantity || 1
    const discountRate = order.configuration?.discount || order.discount || discount || 0

    const unitPriceAfterDiscount = quantity > 0 ? totalPrice / quantity : 0
    const hasDiscount = discountRate > 0
    const discountPercentage = Math.round(discountRate > 1 ? discountRate : discountRate * 100)
    const subtotal = configPrice * quantity
    const discountAmount = hasDiscount ? (subtotal * (discountRate > 1 ? discountRate / 100 : discountRate)) : 0

    console.log("Price calculations in ThankYou component:", {
      configPrice,
      totalPrice,
      quantity,
      discountRate,
      unitPriceAfterDiscount,
      hasDiscount,
      discountPercentage,
      subtotal,
      discountAmount
    });

    return {
      configPrice,
      totalPrice,
      quantity,
      discountRate,
      unitPriceAfterDiscount,
      hasDiscount,
      discountPercentage,
      subtotal,
      discountAmount
    }
  }, [order, discount])

  // Debugging useEffect to log order data
  useEffect(() => {
    console.log("=== DEBUG THANK YOU PAGE ===");
    console.log("Initial Order:", initialOrder);
    console.log("Order from useQuery:", order);
    console.log("Locale:", locale);
    console.log("=== END DEBUG ===");
  }, [initialOrder, order, locale]);

  // useEffect for validating the order and managing localStorage
  useEffect(() => {
    const validateOrder = () => {
      if (!orderId) {
        console.log("No orderId provided, redirecting to home");
        router.push("/");
        return;
      }

      if (isLoading) {
        return; // Wait for data to load before validating
      }

      if (!order || !order.isCompleted) {
        console.log("Order not found or not completed, redirecting to home");
        router.push("/");
        return;
      }

      // Logic to prevent re-showing the thank you page for an old order
      const lastCompletedOrderId = localStorage.getItem("lastCompletedOrderId");
      if (lastCompletedOrderId !== orderId) {
        console.log("New completed order detected, updating localStorage");
        localStorage.setItem("lastCompletedOrderId", orderId);
      }

      setIsValidatingOrder(false);
    };

    const timeoutId = setTimeout(validateOrder, 100);
    return () => clearTimeout(timeoutId);
  }, [orderId, router, order, isLoading]);

  // Loading state while validating
  if (isValidatingOrder || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">{t('loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        <div className="text-center">
          <p className="text-destructive mb-4">{t('errorLoadingOrderDetails')}</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // No order found state
  if (!order || !priceCalculations) {
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        <div className="text-center">
          <p className="text-muted-foreground">{t('noOrderFound')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('checkOrderId')}</p>
        </div>
      </div>
    );
  }

  // Order not completed state
  if (order.isCompleted !== true) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">{t('orderNotCompleted')}</p>
          <p className="text-muted-foreground">{t('completeOrderFirst')}</p>
        </div>
      </div>
    );
  }

  // Check if the shipping address is in Cairo
  const isCairo = order.shippingAddress?.state
    ?.toLowerCase()
    ?.replace(/\s/g, "")
    ?.match(/cairo|القاهرة/) !== null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      dir={isRTL ? "rtl" : "ltr"}
      className={isRTL ? "rtl" : "ltr"}
    >
      <Breadcrumb />
      <div className="p-0">
        <Container>
          <div className="pt-6 pb-12 px-0">
            <div className="max-w-2xl">
              <p className="text-base font-medium text-primary">{t('pageTitle')}</p>
              <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight lg:text-5xl">
                {t('productOnTheWay')}
              </h1>
              <p className="mb-6 text-lg text-muted-foreground">
                {t('orderReceived')}
              </p>
            </div>

            <div className="mt-10 md:-mb-10 border-t border-border">
              <div className="mt-10 flex flex-auto flex-col">
                <h4 className="text-xl font-semibold">
                  {t('greatChoice')}
                </h4>
                <p className="mt-2 text-lg text-muted-foreground">
                  {t('qualityDescription')}
                </p>
              </div>
            </div>

            <section className="w-full py-12 md:py-24 lg:py-32">
              <div className="grid gap-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('orderSummary')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 items-center">
                        <div className="font-medium">{t('orderNumber')}</div>
                        <div className={isRTL ? "text-left" : "text-right"}>#{formatNumber(order.id, isRTL ? "ar" : "en")}</div>
                      </div>
                      <div className="grid grid-cols-2 items-center">
                        <div className="font-medium">{t('shippingAddress')}</div>
                        <div className={isRTL ? "text-left" : "text-right"}>
                          {order.shippingAddress?.fullName}
                          <br />
                          {order.shippingAddress?.phoneNumber} <br />
                          {order.shippingAddress?.address} <br />
                          {order.shippingAddress?.city},{" "}
                          {order.shippingAddress?.state}{" "}
                          {order.shippingAddress?.zipCode}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 items-center">
                        <div className="font-medium">{t('estimatedDeliveryDate')}</div>
                        <div className={isRTL ? "text-left" : "text-right"}>{estimatedDeliveryDate}</div>
                      </div>
                      <div className="grid grid-cols-2 items-center">
                        <div className="font-medium">{t('shippingFee')}</div>
                        <div className={isRTL ? "text-left" : "text-right"}>
                          <NormalPrice price={order.shippingPrice} />
                        </div>
                      </div>
                      <Separator />
                      <div className="overflow-x-auto rounded-md custom-scrollbar">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold !rtl:text-right">
                                {t("item")}
                              </TableHead>
                              <TableHead className="font-semibold pl-32" >
                                {t("qty")}
                              </TableHead>
                              <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>
                                {t("colorTemp")}
                              </TableHead>
                              {order.brand === "balcom" && (
                                <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>
                                  {t("wattage")}
                                </TableHead>
                              )}
                              {order.brand === "mister-led" && order.chandelierLightingType === "lamp" && (
                                <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>
                                  {t("lamp")}
                                </TableHead>
                              )}
                              {order.brand === "mister-led" && order.chandelierLightingType === "LED" && (
                                <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>
                                  {t("wattage")}
                                </TableHead>
                              )}
                              {priceCalculations.hasDiscount && (
                                <TableHead className="font-semibold" dir={isRTL ? "rtl" : "ltr"}>
                                  {t("discount")}
                                </TableHead>
                              )}
                              <TableHead className="font-semibold" dir={isRTL ? "rtl" : "ltr"}>
                                {t("price")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>
                                <div className="flex items-center gap-4">
                                  <Image
                                    src={order.productImages[0] || "/placeholder.jpg"}
                                    alt="Product Image"
                                    width={70}
                                    height={70}
                                    className="rounded-md object-cover"
                                  />
                                  <div className="text-left rtl:text-right">
                                    <h4 className="text-nowrap font-semibold text-card-foreground">
                                      {order.productName}
                                    </h4>
                                    <p className="text-muted-foreground font-medium text-xs md:text-sm wrap-break-word text-wrap">
                                      {t("modernDesign")}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold pl-32 pr-10">
                                {formatNumber(priceCalculations.quantity, isRTL ? "ar" : "en")}
                              </TableCell>
                              <TableCell className="font-semibold capitalize">
                                {PRODUCT_TEMP_LABEL_MAP[locale as SupportedLanguage]?.[order.productColorTemp as ProductColorTemp] || order.productColorTemp}
                              </TableCell>
                              {order.brand === "balcom" && (
                                <TableCell className="font-semibold">
                                  {order.product.specifications?.[0]?.maximumWattage || "N/A"}W
                                </TableCell>
                              )}
                              {order.brand === "mister-led" &&
                                order.chandelierLightingType === "lamp" && (
                                  <TableCell className="font-semibold capitalize ">
                                    {bulbLabel(order) ??
                                      (isProductChandLamp(order.productChandLamp)
                                        ? tLamp(order.productChandLamp)
                                        : "—")}
                                  </TableCell>
                                )}
                              {order.brand === "mister-led" &&
                                order.chandelierLightingType === "LED" && (
                                  <TableCell className="font-semibold">
                                    {order.product.specifications?.[0]?.maximumWattage || "N/A"}W
                                  </TableCell>
                                )}
                              {priceCalculations.hasDiscount && (
                                <TableCell className="text-destructive font-semibold">
                                  {priceCalculations.discountPercentage}%
                                </TableCell>
                              )}
                              {priceCalculations.hasDiscount ? (
                                <TableCell className="text-sm pr-4 sm:pr-0">
                                  <div className="space-y-1">
                                    <div className="text-destructive font-semibold">
                                      <NormalPrice price={priceCalculations.unitPriceAfterDiscount} />
                                    </div>
                                  </div>
                                </TableCell>
                              ) : (
                                <TableCell className="font-semibold">
                                  <NormalPrice price={priceCalculations.unitPriceAfterDiscount} />
                                </TableCell>
                              )}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <Separator />
                      <div className="space-y-2.5">
                        {priceCalculations.hasDiscount ? (
                          <>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('subtotal')}
                              </div>
                              <div className={`text-base font-semibold text-muted-foreground line-through ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={priceCalculations.subtotal} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('discount')}
                              </div>
                              <div className={`text-base font-semibold text-primary flex justify-end ${isRTL ? "text-left" : "text-right"}`}>
                                <span>
                                  -{priceCalculations.discountPercentage}%
                                </span>
                                <span className="flex ml-1">({"  "}<NormalPrice price={priceCalculations.discountAmount} />)</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('afterDiscount')}
                              </div>
                              <span className={`text-base font-semibold ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={priceCalculations.totalPrice} />
                              </span>
                            </div>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('shippingFee')}
                              </div>
                              <div className={`text-base font-semibold ${isRTL ? "text-left" : "text-right"}`}>
                                {isCairo ? (
                                  <NormalPrice price={order.shippingPrice} />
                                ) : (
                                  <p className="text-sm">
                                    {t('outsideCairoShipping')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium">{t('total')}</div>
                              <div className={`text-lg font-semibold text-destructive ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={priceCalculations.totalPrice + order.shippingPrice} />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('subtotal')}
                              </div>
                              <span className={`text-base font-semibold ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={priceCalculations.totalPrice} />
                              </span>
                            </div>
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium text-muted-foreground">
                                {t('shippingFee')}
                              </div>
                              <div className={`text-base font-semibold ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={order.shippingPrice} />
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 items-center">
                              <div className="font-medium">{t('total')}</div>
                              <span className={`text-lg font-semibold ${isRTL ? "text-left" : "text-right"}`}>
                                <NormalPrice price={priceCalculations.totalPrice + order.shippingPrice} />
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className={`flex mt-10 ${isRTL ? "justify-start" : "justify-end"}`}>
                <Link
                  href="/category"
                  className="inline-flex h-12 items-center justify-center rounded-md text-primary-foreground bg-primary px-10 text-lg font-medium shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  prefetch={false}
                >
                  {t('continueShopping')}
                </Link>
              </div>
            </section>
          </div>
        </Container>
      </div>
    </motion.div>
  );
};

/**
 * What the order was actually bought with.
 *
 * Falls back to the old productChandLamp string for orders placed before
 * bulbs were rows — and to a dash rather than "Unknown Lamp", which is not
 * a thing a customer should read on their own receipt.
 */
function bulbLabel(order: { bulb?: { wattage: number; translations: { name: string }[] } | null }) {
  const name = order.bulb?.translations[0]?.name
  if (!order.bulb || !name) return null
  return `${name} ${order.bulb.wattage}W`
}
