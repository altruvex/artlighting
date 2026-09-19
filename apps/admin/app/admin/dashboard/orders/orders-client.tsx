"use client";

import DashboardHeader from "@/components/dashboard-header";
import DiscountPrice from "@/components/discount-price";
import NormalPrice from "@/components/normal-price";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@repo/database";
import { SearchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import StatusDropdown from "../status-dropdown-menu";

type OrderWithShipping = Prisma.OrderGetPayload<{
  include: { shippingAddress: true; product: true; configuration: true };
}>;

interface OrdersClientProps {
  orders: OrderWithShipping[];
}

const OrdersClient: React.FC<OrdersClientProps> = ({ orders }) => {
  const t = useTranslations("Orders");
  const tCommon = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const format = useFormatter();
  const formatMoney = (value: number) =>
    format.number(value, { style: "currency", currency: "EGP" });
  // Free-text DB values: translate known ones, show anything else as stored.
  const valueLabel = (group: "colorTemp" | "lamp" | "lightingType", value: string) => {
    const key = `values.${group}.${value.toLowerCase()}`;
    return t.has(key as never) ? t(key as never) : value;
  };
  const [searchItem, setSearchItem] = useState<string>("");
  const [filteredOrders, setFilteredOrders] =
    useState<OrderWithShipping[]>(orders);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchItem(searchValue);
    setLoading(true);
    setError(null);
    try {
      const searchId = Number(searchValue);
      const newFilteredOrders = orders.filter(
        (order) =>
          order.id === searchId ||
          order.productName.toLowerCase().includes(searchValue.toLowerCase()) ||
          order.shippingAddress?.fullName
            .toLowerCase()
            .includes(searchValue.toLowerCase()),
      );
      setFilteredOrders(newFilteredOrders);
    } catch (error) {
      setError(t("filterError"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("orders")}>
        <div className="flex items-center gap-4 md:ms-auto">
          <form className="ms-auto flex-1 sm:flex-initial">
            <div className="relative">
              <SearchIcon className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchItem}
                onChange={handleInputChange}
                type="text"
                placeholder={t("searchPlaceholder")}
                className="ps-8 w-full sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
        </div>
      </DashboardHeader>
      <div className="mt-10 px-6">
        <h2 className="text-xl font-semibold mb-7">{t("allOrders")}</h2>
        <div className="overflow-x-auto border rounded-lg shadow custom-scrollbar">
          <div className="flex items-center">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-nowrap">{t("columns.orderNumber")}</TableHead>
                  <TableHead className="text-nowrap">{t("columns.customerName")}</TableHead>
                  <TableHead>{t("columns.product")}</TableHead>
                  <TableHead className="text-nowrap ps-4">
                    {t("columns.colorTemp")}
                  </TableHead>
                  <TableHead className="text-nowrap ">{t("columns.ipRating")}</TableHead>
                  <TableHead className="text-nowrap ">{t("columns.lampWattage")}</TableHead>
                  <TableHead className="text-nowrap">{t("columns.productPrice")}</TableHead>
                  <TableHead>{t("columns.discount")}</TableHead>
                  <TableHead className="text-nowrap">
                    {t("columns.priceAfterDiscount")}
                  </TableHead>
                  <TableHead>{t("columns.qty")}</TableHead>
                  <TableHead className="text-nowrap">{t("columns.shippingFee")}</TableHead>
                  <TableHead>{t("columns.total")}</TableHead>
                  <TableHead className="text-nowrap">{t("columns.customer")}</TableHead>
                  <TableHead className="text-nowrap">{t("columns.phoneNumber")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                  <TableHead className="text-nowrap">
                    {t("columns.estimatedOrderDate")}
                  </TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">
                      {tCommon("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center text-destructive"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">
                      {t("noOrders")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  !error &&
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="px-4 py-2">
                        <Link
                          href={`/admin/dashboard/orders/${order.id}`}
                          className="hover:text-primary hover:underline"
                          dir="ltr"
                        >
                          # {order.id}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-nowrap">
                        {order.shippingAddress?.fullName}
                      </TableCell>
                      <TableCell className="flex w-[250px] items-center">
                        {order.productImages &&
                          order.productImages.length > 0 && (
                            <Image
                              src={order.productImages[0]}
                              alt={t("productImageAlt")}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                          )}
                        <p className="ms-2 uppercase text-nowrap font-medium">
                          {order.productName}
                        </p>
                      </TableCell>
                      <TableCell className="capitalize font-medium ps-6">
                        {valueLabel("colorTemp", order.productColorTemp)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order && order.brand === "balcom"
                          ? order.configuration?.productIp
                          : t("noIp")}
                      </TableCell>
                      <TableCell>
                        {order &&
                          order.brand === "mister-led" &&
                          order.product?.chandelierLightingType === "lamp"
                          ? valueLabel("lamp", order.productChandLamp)
                          : t("noLamp")}
                      </TableCell>
                      <TableCell className="px-4 py-2 font-medium">
                        <NormalPrice price={order.configPrice} />
                      </TableCell>
                      <TableCell className="text-nowrap px-4 py-2">
                        {order.discountRate && order.discountRate > 0 ? (
                          format.number(order.discountRate, {
                            style: "percent",
                            maximumFractionDigits: 2,
                          })
                        ) : (
                          <span>{t("noDiscount")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.discountRate && order.discountRate > 0 ? (
                          <DiscountPrice
                            price={order.configPrice}
                            discount={order.discountRate}
                          />
                        ) : (
                          <span>{t("noDiscountOnProduct")}</span>
                        )}
                      </TableCell>
                      <TableCell>{format.number(order.quantity)}</TableCell>
                      <TableCell>{formatMoney(order.shippingPrice)}</TableCell>
                      <TableCell>
                        {order.discountRate && order.discountRate > 0 ? (
                          <DiscountPrice
                            price={order.configPrice}
                            discount={order.discountRate}
                            quantity={order.quantity}
                            shippingPrice={order.shippingPrice}
                          />
                        ) : (
                          <NormalPrice
                            price={order.configPrice}
                            shippingPrice={order.shippingPrice}
                            quantity={order.quantity}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-nowrap">
                        {order.shippingAddress?.fullName}
                      </TableCell>
                      <TableCell>
                        <span dir="ltr">{order.shippingAddress?.phoneNumber}</span>
                      </TableCell>
                      <TableCell>
                        {format.dateTime(order.createdAt, { dateStyle: "medium" })}
                      </TableCell>
                      <TableCell className="text-nowrap">
                        {order.orderTimeReceived &&
                          format.dateTime(order.orderTimeReceived, {
                            dateStyle: "medium",
                          })}
                      </TableCell>
                      <TableCell>
                        <StatusDropdown
                          id={order.id}
                          orderStatus={order.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersClient;
