"use client";

import {
  type AdminColumn,
  ServerDataTable,
  type TableParams,
} from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import type { OrderStatus } from "@repo/database";
import { PackageIcon, ShoppingBagIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export interface CustomerOrderRow extends Record<string, unknown> {
  id: number;
  productName: string;
  /** Lines after the first. */
  moreProducts: number;
  imageUrl: string | null;
  quantity: number;
  /** Serialized money (see @repo/money): a string, never a float. */
  total: string;
  status: OrderStatus;
  createdAt: Date;
}

const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  awaiting_shipment: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  fulfilled: "success",
  cancelled: "danger",
  refunded: "danger",
};

const STATUS_ORDER: OrderStatus[] = [
  "awaiting_shipment",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
  "refunded",
];

export function UserClient({
  orders,
  total,
  params,
}: {
  orders: CustomerOrderRow[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("CustomerDetail");
  const tCommon = useTranslations("Common");
  const tOrders = useTranslations("Orders");
  const format = useFormatter();
  const locale = useLocale();

  const columns = useMemo<AdminColumn<CustomerOrderRow>[]>(
    () => [
      {
        id: "order",
        accessorFn: (row) => `${row.id} ${row.productName}`,
        header: t("columns.orderNumber"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/orders/${row.original.id}`}
            prefetch={false}
            className="font-medium tabular-nums hover:underline"
            dir="ltr"
          >
            #{row.original.id}
          </Link>
        ),
      },
      {
        id: "product",
        accessorFn: (row) => row.productName,
        enableSorting: false,
        header: t("columns.product"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt={t("productImageAlt")}
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"
              >
                <PackageIcon className="size-4 text-muted-foreground" />
              </span>
            )}
            <span className="line-clamp-2 min-w-0 text-sm">
              {row.original.productName}
              {row.original.moreProducts > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {tOrders("moreProducts", {
                    count: row.original.moreProducts,
                  })}
                </span>
              )}
            </span>
          </div>
        ),
      },
      {
        id: "quantity",
        meta: { align: "end" },
        accessorFn: (row) => row.quantity,
        enableSorting: false,
        header: t("columns.qty"),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.quantity}</span>
        ),
      },
      {
        id: "total",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.total),
        header: tCommon("total"),
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatMoney(row.original.total, { locale })}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        enableSorting: false,
        header: tCommon("status"),
        cell: ({ row }) => (
          <StatusBadge tone={STATUS_TONES[row.original.status]}>
            {t(`orderStatus.${row.original.status}`)}
          </StatusBadge>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.createdAt.getTime(),
        header: t("columns.orderDate"),
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {format.dateTime(row.original.createdAt, { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm" className="h-7">
              <Link
                href={`/dashboard/orders/${row.original.id}`}
                prefetch={false}
              >
                {t("viewOrder")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t, tCommon, tOrders, format, locale],
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
          options: STATUS_ORDER.map((status) => ({
            value: status,
            label: t(`orderStatus.${status}`),
          })),
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
