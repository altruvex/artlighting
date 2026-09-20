"use client";

import { Container } from "@/components/container";
import NormalPrice from "@/components/normal-price";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PRODUCT_TEMP_LABEL_MAP } from "@/config/config";
import { useRouter } from "@/i18n/navigation";
import { calculateEstimatedDeliveryDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { PricingCalculation, PricingService } from "@/lib/pricing.server";
import { isProductChandLamp } from "@/lib/utils";
import type { Configuration, Order, Product, ProductColorTemp, ProductSpecification, ShippingAddress, SupportedLanguage } from "@/types/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, DiscIcon, LightbulbIcon, Loader2, Package, Truck, VariableIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type OrderWithRelations = Order & {
  product: Product & {
    specifications: ProductSpecification[]
  }
  shippingAddress: ShippingAddress | null
  configuration: Configuration | null
  /** Rate, not percent: 0.13 = 13%. Serialized; see @repo/money. */
  discount: string | null
}

interface UpdateOrderStatusResponse {
  success: boolean
  order: Order
}

const fetchOrderDetails = async (orderId: string): Promise<OrderWithRelations> => {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch order details");
  }
  return response.json();
};

const updateOrderStatus = async (orderId: string): Promise<UpdateOrderStatusResponse> => {
  const response = await fetch("/api/webhooks/completeOrder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to complete the order");
  }

  return response.json();
};

type CompleteProps = {
  /** Rate, not percent: 0.13 = 13%. */
  discount: string
  brand: string
  order: OrderWithRelations
}

const Complete = ({ discount, brand, order: initialOrder }: CompleteProps) => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const router = useRouter();
  const locale = (useLocale() as SupportedLanguage) || "en";
  const t = useTranslations("complete");
  const tLamp = useTranslations('ProductChandLampButtons');
  const isRTL = locale === "ar";

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["orderDetails", orderId],
    queryFn: () => fetchOrderDetails(orderId!),
    enabled: !!orderId,
    initialData: initialOrder,
  });

  const priceCalculations = useMemo<PricingCalculation | null>(() => {
    if (!order) return null;

    return PricingService.calculateOrderPricing(
      order.configuration?.configPrice ?? order.configPrice ?? 0,
      order.configuration?.totalPrice ?? order.totalPrice ?? 0,
      order.configuration?.quantity || order.quantity || 1,
      order.configuration?.discount ?? order.discount ?? discount ?? 0,
      order.shippingPrice
    );
  }, [order, discount]);

  const estimatedDeliveryDate = useMemo(() => calculateEstimatedDeliveryDate(isRTL ? "ar" : "en"), [isRTL]);

  const { mutate: handleComplete, isPending } = useMutation({
    mutationKey: ["confirmOrder", orderId],
    mutationFn: async () => updateOrderStatus(orderId!),
    onSuccess: (response) => {
      if (response.success && response.order?.isCompleted) {
        toast.success(t("complete-notifications.success"));
        router.push(`/thank-you?orderId=${response.order.id}`);
      } else {
        toast.error(t("complete-notifications.error.title"), {
          description: t("complete-notifications.error.description"),
        });
      }
    },
    onError: (error) => {
      toast.error(t("complete-notifications.error-unknown"));
    },
  });

  useEffect(() => {
    if (order?.isCompleted) {
      localStorage.setItem("lastCompletedOrderId", order.id.toString());
    }
  }, [order]);

  if (isLoading) return <div className="flex justify-center items-center h-screen">{t("loadingOrderDetails")}</div>;
  if (error) return <div className="flex justify-center items-center h-screen">{t("errorLoadingOrderDetails")}</div>;
  if (!order || !priceCalculations) return <div className="flex justify-center items-center h-screen">{t("noOrderFound")}</div>;

  const isCairo = order.shippingAddress?.state?.toLowerCase()?.replace(/\s/g, "")?.match(/cairo|القاهرة/) !== null;
  const productColorTempLabel = PRODUCT_TEMP_LABEL_MAP[locale]?.[order.productColorTemp as ProductColorTemp] ?? order.productColorTemp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-8"
    >
      <Container>
        <div className={`grid gap-8 lg:grid-cols-3 lg:gap-12 ${isRTL ? "rtl" : "ltr"}`}>
          <div className="lg:col-span-2">
            <div className="grid gap-8">
              <div className="space-y-4">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">{t("title")}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{t("description")}</p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Package className="mr-2 rtl:ml-2 text-primary" /> {t("orderProcessing")}
                  </span>
                  <span className="flex items-center">
                    <Truck className="mr-2 rtl:ml-2 text-primary" /> {t("readyForShipping")}
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="mr-2 rtl:ml-2 text-primary" /> {t("orderComplete")}
                  </span>
                </div>
              </div>
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Ordered Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold !rtl:text-right">{t("product")}</TableHead>
                            <TableHead className="font-semibold pl-32">{t("qty")}</TableHead>
                            <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>{t("colorTemp")}</TableHead>
                            {brand === "balcom" && (
                              <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>{t("wattage")}</TableHead>
                            )}
                            {brand === "mister-led" && order.chandelierLightingType === "lamp" && (
                              <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>{t("lamp")}</TableHead>
                            )}
                            {brand === "mister-led" && order.chandelierLightingType === "LED" && (
                              <TableHead className="font-semibold text-nowrap" dir={isRTL ? "rtl" : "ltr"}>{t("wattage")}</TableHead>
                            )}
                            {priceCalculations.hasDiscount && (
                              <TableHead className="font-semibold" dir={isRTL ? "rtl" : "ltr"}>{t("discount")}</TableHead>
                            )}
                            <TableHead className="font-semibold" dir={isRTL ? "rtl" : "ltr"}>{t("price")}</TableHead>
                            <TableHead className="font-semibold" dir={isRTL ? "rtl" : "ltr"}>{t("total")}</TableHead>
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
                                  <h4 className="text-nowrap font-semibold text-card-foreground">{order.productName}</h4>
                                  <p className="text-muted-foreground font-medium text-xs md:text-sm text-wrap">{t("modernDesign")}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold pl-32 pr-10">
                              {formatNumber(priceCalculations.quantity, isRTL ? "ar" : "en")}
                            </TableCell>
                            <TableCell className="font-semibold capitalize">{productColorTempLabel}</TableCell>
                            {brand === "balcom" && (
                              <TableCell className="font-semibold">{order.product.specifications?.[0]?.maximumWattage || "N/A"}W</TableCell>
                            )}
                            {brand === "mister-led" && order.chandelierLightingType === "lamp" && (
                              <TableCell className="font-semibold capitalize">
                                {isProductChandLamp(order.productChandLamp) ? tLamp(order.productChandLamp) : "Unknown Lamp"}
                              </TableCell>
                            )}
                            {brand === "mister-led" && order.chandelierLightingType === "LED" && (
                              <TableCell className="font-semibold">{order.product.specifications?.[0]?.maximumWattage || "N/A"}W</TableCell>
                            )}
                            {priceCalculations.hasDiscount && (
                              <TableCell className="text-destructive font-semibold">{priceCalculations.discountPercentage}% {t("off")}</TableCell>
                            )}
                            {priceCalculations.hasDiscount ? (
                              <>
                                <TableCell className="text-sm pr-4 sm:pr-0">
                                  <div className="space-y-1">
                                    <div className="text-destructive font-semibold">
                                      <NormalPrice price={priceCalculations.unitPriceAfterDiscount} />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <NormalPrice price={priceCalculations.totalPrice} shippingPrice={order.shippingPrice} />
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-semibold">
                                  <NormalPrice price={priceCalculations.unitPriceAfterDiscount} />
                                </TableCell>
                                <TableCell className="font-semibold">
                                  <NormalPrice price={priceCalculations.totalPrice} shippingPrice={order.shippingPrice} />
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">{t("shippingInformation")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[600px]">
                      <div className="grid gap-x-4 gap-y-1.5">
                        <div className="gap-2 grid grid-cols-1 md:grid-cols-2">
                          <address className="not-italic text-muted-foreground tracking-wide md:text-base sm:text-sm text-xs leading-5">
                            <h3 className="font-semibold text-foreground">{t("shippingAddress")}</h3>
                            {order.shippingAddress ? (
                              <>
                                <p className="md:text-base text-sm">{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.zipCode}, {order.shippingAddress.state}</p>
                              </>
                            ) : (
                              <p>{t("noShippingAddressAvailable")}</p>
                            )}
                          </address>
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              {t("estimatedDeliveryDate")}
                              <span className="inline-block font-normal not-italic text-muted-foreground tracking-wide md:text-base sm:text-sm text-xs leading-5">
                                {estimatedDeliveryDate}
                              </span>
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{t("customerDetails")}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="p-6 pt-0 min-w-[600px]">
                      <div className="grid gap-x-4 gap-y-1.5">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{t("name")}</h3>
                          <p className="not-italic text-muted-foreground tracking-wide md:text-base sm:text-sm text-xs leading-5">
                            {order.shippingAddress?.fullName || t("na")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{t("phoneNumber")}</h3>
                          <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                            <span>{order.shippingAddress?.phoneNumber || t("na")}</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{t("billingAddress")}</h3>
                          <address className="not-italic text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                            {order.shippingAddress ? (
                              <>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.zipCode}</p>
                              </>
                            ) : (
                              <p>{t("noBillingAddressAvailable")}</p>
                            )}
                          </address>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-8">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t("shippingInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="p-6 pt-0 min-w-[300px]">
                    <div className="grid gap-4">
                      <div>
                        <h3 className="font-medium text-base sm:text-lg">{t("deliveryDetails")}</h3>
                        <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                          {isCairo ? t("cairoDelivery") : t("outsideCairoShipping")}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-base sm:text-lg">{t("shippingAddress")}</h3>
                        {order.shippingAddress ? (
                          <>
                            <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                              {order.shippingAddress.fullName}
                            </p>
                            <p className="tracking-wide leading-6">
                              {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}, {order.shippingAddress.country}
                            </p>
                            <p className="tracking-wide leading-6">
                              {t("phoneNumber")}: {order.shippingAddress.phoneNumber}
                            </p>
                          </>
                        ) : (
                          <p>{t("noShippingAddressAvailable")}</p>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-base sm:text-lg">{t("shippingCost")}</h3>
                        <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                          {isCairo ? t("fixedRateForCairo") : t("toBeDetermined")}
                        </p>
                        <div className="tracking-wide leading-6 font-semibold text-primary">
                          {isCairo ? <NormalPrice price={order.shippingPrice} /> : t("willContactForShippingPrice")}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-base sm:text-lg">{t("estimatedDeliveryTime")}</h3>
                        <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                          {isCairo ? t("businessDays") : t("toBeDetermined")}
                        </p>
                        <p className="tracking-wide leading-6">
                          {isCairo ? t("striveForQuickDelivery") : t("deliveryTimeWillBeProvided")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t("whyChooseOurProducts")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="p-6 pt-0 min-w-[300px]">
                    <div className="grid gap-4">
                      <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <LightbulbIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                        <div>
                          <h3 className="font-medium text-base sm:text-lg">{t("energyEfficient")}</h3>
                          <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                            {t("energyEfficientDesc")}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <VariableIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                        <div>
                          <h3 className="font-medium text-base sm:text-lg">{t("adjustableBrightness")}</h3>
                          <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                            {t("adjustableBrightnessDesc")}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <DiscIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                        <div>
                          <h3 className="font-medium text-base sm:text-lg">{t("durableConstruction")}</h3>
                          <p className="text-muted-foreground tracking-wide sm:text-base text-sm leading-5 -my-1">
                            {t("durableConstructionDesc")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className={`flex ${isRTL ? "justify-start" : "justify-end"} my-10`}>
          <Button
            onClick={() => handleComplete()}
            disabled={isPending}
            className="inline-flex sm:h-[52px] h-10 items-center justify-center rounded-md bg-primary sm:px-10 px-8 sm:text-lg text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("LoadingCompleteYourOrder")}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                {t("completeYourOrder")}
              </div>
            )}
          </Button>
        </div>
      </Container>
    </motion.div>
  );
};

export default Complete;