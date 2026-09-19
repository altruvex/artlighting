"use client";
import DashboardHeader from "@/components/dashboard-header";
import DashboardSummary from "@/components/dashboard-summary";
import DiscountPrice from "@/components/discount-price";
import NormalPrice from "@/components/normal-price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderStatus, Product, ShippingAddress, User } from "@repo/database";
import { MoveHorizontalIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardServer } from "./dashboard-server";

interface Order {
  id: number;
  user: User;
  product: Product;
  shippingAddress: ShippingAddress;
  createdAt: string;
  totalPrice: number;
  status: string;
  configPrice: number;
  quantity: number;
  productPrice: number;
  shippingPrice: number;
  discountRate: number;
}
interface DashboardData {
  orders: Order[];
  totalCustomers: number;
  totalOrdersThatOrdered: number;
  TotalSales: {
    _sum: {
      totalPrice: number | null;
    };
  };
  user: {
    imageUrl: string;
  };
}
const getStatusBadgeClassName = (status: OrderStatus) => {
  switch (status) {
    case "cancelled":
    case "refunded":
      return "bg-destructive text-white hover:bg-destructive/90";
    case "processing":
      return "bg-primary text-primary-foreground hover:bg-primary/90";
    case "fulfilled":
    case "delivered":
      return "bg-emerald-500 text-white hover:bg-emerald-500/90";
    case "awaiting_shipment":
      return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted/90";
  }
};
const Dashboard = () => {
  const t = useTranslations("Dashboard");
  const tStatus = useTranslations("OrderStatus");
  const tCommon = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const format = useFormatter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    const loadData = async () => {
      const dashboardData = await DashboardServer();
      setData(dashboardData);
    };
    loadData();
  }, []);
  const totalSalesAfterCancellation = useMemo(() => {
    if (!data) return 0;
    const cancelledOrdersTotal = data.orders
      .filter((order) => order.status === "cancelled")
      .reduce((acc, order) => acc + (order.configPrice || 0), 0);
    const totalSales = Math.ceil(data.TotalSales?._sum?.totalPrice ?? 0);
    return totalSales - cancelledOrdersTotal;
  }, [data]);
  const filteredOrder = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((order) => {
      return filter === "all" || order.status.toLowerCase() === filter;
    });
  }, [data, filter]);
  const renderOrders = useMemo(
    () =>
      filteredOrder.map((order) => (
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
          <TableCell className="px-4 py-2 ext-nowrap ">
            {order.shippingAddress.fullName}
          </TableCell>
          <TableCell className="px-4 py-2 text-nowrap uppercase">
            {order.product?.productName}
          </TableCell>
          <TableCell className="px-4 py-2">
            {order.discountRate > 0 ? (
              <DiscountPrice
                price={order.configPrice}
                discount={order.discountRate}
              />
            ) : (
              <NormalPrice price={order.configPrice} />
            )}
          </TableCell>
          <TableCell className="px-4 py-2">
            {order.discountRate > 0
              ? format.number(order.discountRate, {
                  style: "percent",
                  maximumFractionDigits: 2,
                })
              : t("noDiscount")}
          </TableCell>
          <TableCell>{format.number(order.quantity)}</TableCell>
          <TableCell>
            {format.number(order.shippingPrice, {
              style: "currency",
              currency: "EGP",
            })}
          </TableCell>
          <TableCell className="px-4 py-2">
            {order.discountRate > 0 ? (
              <DiscountPrice
                price={order.configPrice}
                discount={order.discountRate}
                quantity={order.quantity}
                shippingPrice={order.shippingPrice}
              />
            ) : (
              <NormalPrice
                price={order.configPrice}
                quantity={order.quantity}
                shippingPrice={order.shippingPrice}
              />
            )}
          </TableCell>
          <TableCell className="px-4 py-2">
            {format.dateTime(new Date(order.createdAt), { dateStyle: "medium" })}
          </TableCell>
          <TableCell className="px-4 py-2">
            <Badge
              className={`${getStatusBadgeClassName(order.status as OrderStatus)} rounded-full`}
            >
              {tStatus(order.status as OrderStatus)}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoveHorizontalIcon className="w-4 h-4" />
                  <span className="sr-only">{tCommon("actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/dashboard/orders/${order.id}`}>{t("viewOrder")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/dashboard/users/${order.user.id}`}>{t("customerDetails")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      )),
    [filteredOrder, format, t, tCommon, tStatus],
  );
  if (!data)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  const { totalCustomers, totalOrdersThatOrdered, user } = data;
  return (
    <div className="min-h-screen">
      <div className="flex flex-col">
        <DashboardHeader user={user} Route={tNav("dashboard")} />
        <div className="px-3 lg:px-4">
          <div className="flex-1 flex flex-col gap-4 py-6 lg:py-8">
            <DashboardSummary
              totalSales={totalSalesAfterCancellation}
              totalCustomers={totalCustomers}
              totalOrders={totalOrdersThatOrdered}
            />
            <Tabs defaultValue="all" className="mt-4">
              <TabsList className="flex-wrap gap-0 md:gap-2 ">
                <TabsTrigger
                  className="text-[10px] md:text-sm"
                  value="all"
                  onClick={() => setFilter("all")}
                >
                  {tCommon("all")}
                </TabsTrigger>
                <TabsTrigger
                  className="text-[10px] md:text-sm"
                  value="awaiting_shipment"
                  onClick={() => setFilter("awaiting_shipment")}
                >
                  {tStatus("awaiting_shipment")}
                </TabsTrigger>
                <TabsTrigger
                  className="text-[10px] md:text-sm"
                  value="fulfilled"
                  onClick={() => setFilter("fulfilled")}
                >
                  {tStatus("fulfilled")}
                </TabsTrigger>
                <TabsTrigger
                  className="text-[10px] md:text-sm"
                  value="processing"
                  onClick={() => setFilter("processing")}
                >
                  {tStatus("processing")}
                </TabsTrigger>
                <TabsTrigger
                  className="text-[10px] md:text-sm text-wrap"
                  value="cancelled"
                  onClick={() => setFilter("cancelled")}
                >
                  {tStatus("cancelled")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <section className="pt-5 space-y-6">
              <Card className="glass-surface rounded-2xl">
                <CardHeader className="flex md:flex-row flex-col items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg sm:text-xl font-semibold">
                    {t("recentOrders")}
                  </CardTitle>
                  <CardDescription>
                    {t("recentOrdersDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[600px] flex items-center">
                      <Table className="overflow-auto">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.orderId")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.customer")}
                            </TableHead>
                            <TableHead className="text-nowrap">
                              {t("columns.productId")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.productPrice")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.discount")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.qty")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.shippingFee")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.total")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.date")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.status")}
                            </TableHead>
                            <TableHead className="px-4 py-2 text-sm text-nowrap">
                              {t("columns.action")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{renderOrders}</TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
