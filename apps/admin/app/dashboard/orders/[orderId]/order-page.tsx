"use client";

import { PageHeader, PageShell } from "@/components/page-header";
import { formatMoney, type MoneyInput, moneySortKey } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import type { OrderStatus } from "@repo/database";
import { ArrowLeftIcon, CalendarIcon, MailIcon, MapPinIcon, PackageIcon, PhoneIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { orderStatusTone } from "../../order-status";
import StatusDropdown from "../../status-dropdown-menu";

export interface OrderLineData {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  /** Serialized money (see @repo/money): strings, never floats. */
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
  colorTemp: string | null;
  ipRating: string | null;
  bulb: string | null;
  brand: string | null;
}

export interface OrderDetailData {
  id: number;
  status: OrderStatus;
  /** Epoch milliseconds. */
  createdAt: number;
  updatedAt: number;
  expectedAt: number | null;
  lines: OrderLineData[];
  /** Serialized money (see @repo/money): strings, never floats. */
  subtotal: string;
  discountTotal: string;
  shippingPrice: string;
  total: string;
  customer: { id: string; email: string };
  shipping: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;
}

export default function OrderPage({ order }: { order: OrderDetailData }) {
  const t = useTranslations("OrderDetail");
  const tOrders = useTranslations("Orders");
  const tStatus = useTranslations("OrderStatus");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const locale = useLocale();

  const money = (value: MoneyInput) => formatMoney(value, { locale });
  const date = (value: number) => format.dateTime(new Date(value), { dateStyle: "medium" });
  // Free-text DB values: translate known ones, show anything else as stored.
  const valueLabel = (group: "colorTemp" | "lamp" | "lightingType", value: string) => {
    const key = `values.${group}.${value.toLowerCase()}`;
    return tOrders.has(key as never) ? tOrders(key as never) : value;
  };

  // Free-text DB values: translate known ones, show anything else as stored.
  const specsOf = (line: OrderLineData) =>
    [
      line.colorTemp && { label: t("colorTemperature"), value: valueLabel("colorTemp", line.colorTemp) },
      line.ipRating && { label: t("ipRating"), value: line.ipRating },
      line.bulb && { label: t("bulb"), value: line.bulb },
      line.brand && { label: t("brand"), value: line.brand },
    ].filter((spec): spec is { label: string; value: string } => Boolean(spec));

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span dir="ltr">{t("title", { id: String(order.id) })}</span>
            <StatusBadge tone={orderStatusTone(order.status)}>{tStatus(order.status)}</StatusBadge>
          </span>
        }
        description={t("meta", { placed: date(order.createdAt), updated: date(order.updatedAt) })}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/dashboard/orders">
                <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
                {t("backToOrders")}
              </Link>
            </Button>
            <StatusDropdown id={order.id} orderStatus={order.status} />
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="gap-0 py-4 xl:col-span-2">
          <CardHeader className="px-4 pb-3">
            <CardTitle className="text-sm">{t("lineItems")}</CardTitle>
            <CardDescription className="text-xs">{t("lineItemsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 ps-4">{t("columns.product")}</TableHead>
                    <TableHead className="h-9 text-end">{t("columns.unitPrice")}</TableHead>
                    <TableHead className="h-9 text-end">{t("columns.qty")}</TableHead>
                    <TableHead className="h-9 pe-4 text-end">{t("columns.lineTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((line) => {
                    const specs = specsOf(line);
                    return (
                      <TableRow key={line.id} className="hover:bg-transparent">
                        {/* Wraps: a long product name or a row of specs would
                            otherwise push the figures out of the card. */}
                        <TableCell className="min-w-40 py-3 ps-4 whitespace-normal">
                          <div className="flex items-start gap-3">
                            {line.productImage ? (
                              <Image
                                src={line.productImage}
                                alt=""
                                width={48}
                                height={48}
                                className="size-12 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted"
                              >
                                <PackageIcon className="size-5 text-muted-foreground" />
                              </span>
                            )}
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-pretty">{line.productName}</p>
                              {specs.length > 0 && (
                                <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  {specs.map((spec) => (
                                    <div key={spec.label} className="flex gap-1">
                                      <dt>{spec.label}:</dt>
                                      <dd className="text-foreground">{spec.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-end tabular-nums">{money(line.unitPrice)}</TableCell>
                        <TableCell className="py-3 text-end tabular-nums">{format.number(line.quantity)}</TableCell>
                        <TableCell className="py-3 pe-4 text-end tabular-nums">
                          <span className="block font-medium">{money(line.lineTotal)}</span>
                          {moneySortKey(line.discountAmount) > 0 && (
                            <span className="block text-xs text-success">
                              {t("lineDiscount", { amount: money(line.discountAmount) })}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 py-4">
          <CardHeader className="px-4 pb-3">
            <CardTitle className="text-sm">{t("totals")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 text-sm">
            <TotalRow label={t("subtotal")} value={money(order.subtotal)} />
            {moneySortKey(order.discountTotal) > 0 && (
              <TotalRow label={t("discount")} value={`−${money(order.discountTotal)}`} valueClassName="text-success" />
            )}
            <TotalRow label={t("shipping")} value={money(order.shippingPrice)} />
            <Separator className="my-1" />
            <TotalRow
              label={tCommon("total")}
              value={money(order.total)}
              className="text-base font-semibold [&>span:first-child]:text-foreground"
            />
          </CardContent>
        </Card>

        <Card className="gap-0 py-4 xl:col-span-3">
          <CardHeader className="px-4 pb-3">
            <CardTitle className="text-sm">{t("customer")}</CardTitle>
            <CardDescription className="text-xs">{t("customerDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.shipping?.fullName ?? tOrders("unknownCustomer")}</p>
              <DetailLine icon={MailIcon}>
                <span dir="ltr">{order.customer.email}</span>
              </DetailLine>
              {order.shipping && (
                <DetailLine icon={PhoneIcon}>
                  <span dir="ltr" className="tabular-nums">
                    {order.shipping.phoneNumber}
                  </span>
                </DetailLine>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/users/${order.customer.id}`}>{t("viewCustomer")}</Link>
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t("shippingAddress")}</p>
              {order.shipping ? (
                <>
                  <DetailLine icon={MapPinIcon}>
                    {`${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zipCode}, ${order.shipping.country}`}
                  </DetailLine>
                  {order.expectedAt !== null && (
                    <DetailLine icon={CalendarIcon}>
                      {t("estimatedDelivery", { date: date(order.expectedAt) })}
                    </DetailLine>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{t("noShippingInfo")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function TotalRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

function DetailLine({ icon: Icon, children }: { icon: typeof MailIcon; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words text-foreground">{children}</span>
    </p>
  );
}
