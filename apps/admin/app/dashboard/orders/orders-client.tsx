"use client";

import { type AdminColumn, ServerDataTable, type TableParams } from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@repo/database";
import { PackageIcon, ShoppingBagIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ORDER_STATUSES, orderStatusTone } from "../order-status";
import StatusDropdown from "../status-dropdown-menu";

export interface OrderRow extends Record<string, unknown> {
  id: number;
  userId: string;
  customer: string | null;
  phone: string | null;
  productName: string;
  /** Lines after the first; the row names only one product. */
  moreProducts: number;
  imageUrl: string | null;
  /** Units across every line. */
  quantity: number;
  /** Serialized money (see @repo/money): strings, never floats. */
  shippingPrice: string;
  total: string;
  /** Epoch milliseconds: sorts as a number, formats as a date. */
  createdAt: number;
  expectedAt: number | null;
  status: OrderStatus;
}

export default function OrdersClient({
  orders,
  total,
  params,
}: {
  orders: OrderRow[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("Orders");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("OrderStatus");
  const format = useFormatter();
  const locale = useLocale();

  const columns = useMemo<AdminColumn<OrderRow>[]>(
    () => [
      {
        id: "order",
        accessorFn: (row) => `${row.id} ${row.customer ?? ""}`,
        filterFn: "includesString",
        header: t("columns.orderNumber"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/orders/${row.original.id}`}
            className="font-medium tabular-nums hover:underline"
            dir="ltr"
          >
            #{row.original.id}
          </Link>
        ),
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer ?? "",
        header: t("columns.customerName"),
        cell: ({ row }) => (
          <span className="grid min-w-0 leading-tight">
            {row.original.customer ? (
              <Link
                href={`/dashboard/users/${row.original.userId}`}
                className="font-medium whitespace-nowrap hover:underline"
              >
                {row.original.customer}
              </Link>
            ) : (
              <span className="whitespace-nowrap text-muted-foreground">{t("unknownCustomer")}</span>
            )}
            {row.original.phone && (
              <span className="truncate text-xs text-muted-foreground tabular-nums" dir="ltr">
                {row.original.phone}
              </span>
            )}
          </span>
        ),
      },
      {
        id: "product",
        accessorFn: (row) => row.productName,
        header: t("columns.product"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <PackageIcon className="size-4 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block max-w-[16rem] truncate">{row.original.productName}</span>
              {row.original.moreProducts > 0 && (
                <span className="block text-xs text-muted-foreground">
                  {t("moreProducts", { count: row.original.moreProducts })}
                </span>
              )}
            </span>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "quantity",
        meta: { align: "end" },
        accessorFn: (row) => row.quantity,
        header: t("columns.qty"),
        cell: ({ row }) => <span className="tabular-nums">{format.number(row.original.quantity)}</span>,
        enableSorting: false,
      },
      {
        id: "shipping",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.shippingPrice),
        header: t("columns.shippingFee"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.shippingPrice, { locale })}
          </span>
        ),
      },
      {
        id: "total",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.total),
        header: tCommon("total"),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatMoney(row.original.total, { locale })}
          </span>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.createdAt,
        header: tCommon("date"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {format.dateTime(new Date(row.original.createdAt), { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "expected",
        accessorFn: (row) => row.expectedAt ?? 0,
        header: t("columns.estimatedOrderDate"),
        cell: ({ row }) =>
          row.original.expectedAt ? (
            <span className="whitespace-nowrap tabular-nums">
              {format.dateTime(new Date(row.original.expectedAt), { dateStyle: "medium" })}
            </span>
          ) : (
            <span className="text-muted-foreground">{tCommon("none")}</span>
          ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: tCommon("status"),
        cell: ({ row }) => (
          <StatusBadge tone={orderStatusTone(row.original.status)}>
            {tStatus(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <StatusDropdown
              id={row.original.id}
              orderStatus={row.original.status}
              label={t("changeStatus")}
              className="h-7 w-auto gap-1 px-2 text-xs font-normal"
            />
          </div>
        ),
      },
    ],
    [t, tCommon, tStatus, format],
  );

  return (
    <ServerDataTable
      columns={columns}
      data={orders}
      total={total}
      params={params}
      searchPlaceholder={t("searchPlaceholder")}
      facets={[
        {
          key: "status",
          title: tCommon("status"),
          options: ORDER_STATUSES.map((status) => ({ value: status, label: tStatus(status) })),
        },
      ]}
      emptyState={
        <EmptyState
          icon={ShoppingBagIcon}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      }
    />
  );
}
