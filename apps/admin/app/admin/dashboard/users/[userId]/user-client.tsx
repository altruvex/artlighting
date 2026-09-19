"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@repo/database";
import { PackageIcon, ShoppingBagIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export interface CustomerOrderRow extends Record<string, unknown> {
  id: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  total: number;
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

export function UserClient({ orders }: { orders: CustomerOrderRow[] }) {
  const t = useTranslations("CustomerDetail");
  const tCommon = useTranslations("Common");
  const format = useFormatter();

  const columns = useMemo<AdminColumn<CustomerOrderRow>[]>(
    () => [
      {
        id: "order",
        accessorFn: (row) => `${row.id} ${row.productName}`,
        filterFn: "includesString",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.orderNumber")} />,
        cell: ({ row }) => (
          <Link
            href={`/admin/dashboard/orders/${row.original.id}`}
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
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.product")} />,
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
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <PackageIcon className="size-4 text-muted-foreground" />
              </span>
            )}
            <span className="line-clamp-2 min-w-0 text-sm">{row.original.productName}</span>
          </div>
        ),
      },
      {
        id: "quantity",
        accessorFn: (row) => row.quantity,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.qty")} />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
      },
      {
        id: "total",
        accessorFn: (row) => row.total,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("total")} />,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {format.number(row.original.total, { style: "currency", currency: "EGP" })}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("status")} />,
        cell: ({ row }) => (
          <StatusBadge tone={STATUS_TONES[row.original.status]}>
            {t(`orderStatus.${row.original.status}`)}
          </StatusBadge>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.createdAt.getTime(),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.orderDate")} />,
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
              <Link href={`/admin/dashboard/orders/${row.original.id}`}>{t("viewOrder")}</Link>
            </Button>
          </div>
        ),
      },
    ],
    [t, tCommon, format],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchColumnId="order"
      searchPlaceholder={t("searchPlaceholder")}
      initialPageSize={10}
      columnLabels={{
        order: t("columns.orderNumber"),
        product: t("columns.product"),
        quantity: t("columns.qty"),
        total: tCommon("total"),
        status: tCommon("status"),
        date: t("columns.orderDate"),
      }}
      facets={[
        {
          columnId: "status",
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
