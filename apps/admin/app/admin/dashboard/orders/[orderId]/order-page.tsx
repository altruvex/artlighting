"use client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Configuration, Order, Product, ShippingAddress, User } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Box, Calendar, MapPin, Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import StatusDropdown from "../../status-dropdown-menu";
import { Container } from "@/components/container";

interface OrderPageProps {
  order: Order & {
    shippingAddress: ShippingAddress | null;
    product: Product;
    user: User;
    configuration: Configuration
  };
}

export default function OrderPage({ order }: OrderPageProps) {
  const t = useTranslations("OrderDetail");
  const tOrders = useTranslations("Orders");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const orderProgress = getOrderProgress(order.status);
  const formatMoney = (value: number) =>
    format.number(value, { style: "currency", currency: "EGP" });
  const formatDate = (date: Date) => format.dateTime(date, { dateStyle: "long" });
  // Free-text DB values: translate known ones, show anything else as stored.
  const valueLabel = (group: "colorTemp" | "lamp" | "lightingType", value: string) => {
    const key = `values.${group}.${value.toLowerCase()}`;
    return tOrders.has(key as never) ? tOrders(key as never) : value;
  };

  return (
    <div className="py-8">
      <Container>
        <Card className="mb-8 overflow-hidden glass-surface rounded-2xl">
          <CardHeader className="p-6 bg-primary text-primary-foreground ">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl mb-2">
                  {t("title", { id: order.id })}
                </CardTitle>
                <CardDescription className="text-primary-foreground/803 mt-5">
                  {t("placedOn", { date: formatDate(order.createdAt) })}
                </CardDescription>
              </div>
              <StatusDropdown id={order.id} orderStatus={order.status} />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span>{t("lastUpdated", { date: formatDate(order.updatedAt) })}</span>
            </div>
            <Progress value={orderProgress} className="w-full h-3 mb-2" />
            <div className="flex justify-between text-xs sm:text-sm font-medium">
              <span>{t("progress.ordered")}</span>
              <span>{t("progress.processing")}</span>
              <span>{t("progress.fulfilled")}</span>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-8 md:grid-cols-3 grid-cols-1">
          <Card className="md:col-span-2 glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                <Box className="me-2" /> {t("productInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
                {order.productImages?.[0] && (
                  <Image
                    width={192}
                    height={192}
                    src={order.productImages[0]}
                    alt={order.productName}
                    className="w-full sm:w-48 sm:h-48 object-cover rounded-md shadow-md mb-4 sm:mb-0"
                  />
                )}
                <div className="flex-1 space-y-4">
                  <h3 className="text-lg sm:text-xl font-semibold">
                    {order.productName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProductDetail label={tCommon("quantity")} value={format.number(order.quantity)} />
                    <ProductDetail
                      label={t("colorTemperature")}
                      value={valueLabel("colorTemp", order.productColorTemp)}
                    />
                    <ProductDetail label={t("ipRating")} value={order.configuration.productIp ?? ""} />
                    {order.chandelierLightingType && (
                      <ProductDetail
                        label={t("lampType")}
                        value={valueLabel("lamp", order.productChandLamp)}
                      />
                    )}
                    {order.brand && (
                      <ProductDetail label={t("brand")} value={order.brand} />
                    )}
                    {order.chandelierLightingType && (
                      <ProductDetail
                        label={t("lightingType")}
                        value={valueLabel("lightingType", order.chandelierLightingType)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                {t("priceBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              <div className="space-y-4">
                <PriceDetail
                  label={t("productPrice")}
                  value={formatMoney(order.configPrice)}
                />
                {order.discountRate && order.discountRate > 0 && (
                  <PriceDetail
                    label={t("discountWithRate", {
                      rate: format.number(order.discountRate, { style: "percent" }),
                    })}
                    value={formatMoney(-((order.productPrice - (order.discountedPrice || 0)) * order.quantity))}
                    className="text-green-600"
                  />
                )}
                {order.priceIncrease && order.priceIncrease > 0 && (
                  <PriceDetail
                    label={t("priceIncrease")}
                    value={formatMoney(order.priceIncrease)}
                  />
                )}
                <PriceDetail
                  label={t("shipping")}
                  value={formatMoney(order.shippingPrice)}
                />
                <Separator className="my-2" />
                <PriceDetail
                  label={tCommon("total")}
                  value={formatMoney(order.totalPrice)}
                  className="font-bold text-lg"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-3 glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                <Truck className="me-2" /> {t("shippingInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              {order.shippingAddress ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 me-1.5">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${order.user.email}`}
                          alt={order.user.email ?? ""}
                        />
                        <AvatarFallback>
                          {order.user.email
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {order.shippingAddress.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span dir="ltr">{order.shippingAddress.phoneNumber}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.user.email}
                        </p>
                        <Link
                          href={`/admin/dashboard/Users/${order.user.id}`}
                          className="font-semibold"
                        >
                          {order.user.id}
                        </Link>
                      </div>
                    </div>
                    <ShippingDetail
                      icon={MapPin}
                      value={`${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}, ${order.shippingAddress.country}`}
                    />
                  </div>
                  <div className="space-y-4">
                    {order.orderTimeReceived && (
                      <ShippingDetail
                        icon={Calendar}
                        value={t("estimatedDelivery", {
                          date: formatDate(order.orderTimeReceived),
                        })}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t("noShippingInfo")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
function ProductDetail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="secondary" className="w-fit">
        {value}
      </Badge>
    </div>
  );
}

function PriceDetail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ShippingDetail({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <span className="text-sm">{value}</span>
    </div>
  );
}

function getOrderProgress(status: string): number {
  switch (status.toLowerCase()) {
    case "processing":
      return 50;
    case "fulfilled":
      return 100;
    default:
      return 0;
  }
}
