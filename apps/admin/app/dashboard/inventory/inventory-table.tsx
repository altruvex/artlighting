"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@repo/ui/lib/utils";
import { WarehouseIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";
import { StockActions } from "./stock-actions";

export interface InventoryRow extends Record<string, unknown> {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  locationCode: string;
  onHand: number;
  reserved: number;
  /** onHand - reserved. Computed, never stored — see @repo/catalog. */
  available: number;
  incoming: number;
  reorderPoint: number;
  /** False: made or bought in to order; orders do not reserve it. */
  tracked: boolean;
  low: boolean;
}

export function InventoryTable({ rows, canWrite }: { rows: InventoryRow[]; canWrite: boolean }) {
  const t = useTranslations("Inventory");
  const format = useFormatter();

  const columns = useMemo<AdminColumn<InventoryRow>[]>(
    () => [
      {
        id: "product",
        accessorFn: (row) => `${row.name} ${row.sku}`,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.product")} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/dashboard/products/${row.original.productId}`}
              className="block truncate font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <span className="block truncate text-xs text-muted-foreground" dir="ltr">
              {row.original.sku}
            </span>
          </div>
        ),
      },
      {
        id: "onHand",
        meta: { align: "end" },
        accessorFn: (row) => row.onHand,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.onHand")} />,
        cell: ({ row }) => <span className="tabular-nums">{format.number(row.original.onHand)}</span>,
      },
      {
        id: "reserved",
        meta: { align: "end" },
        accessorFn: (row) => row.reserved,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.reserved")} />,
        cell: ({ row }) => (
          <span className={cn("tabular-nums", row.original.reserved > 0 ? "text-warning" : "text-muted-foreground")}>
            {format.number(row.original.reserved)}
          </span>
        ),
      },
      {
        id: "available",
        meta: { align: "end" },
        accessorFn: (row) => row.available,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.available")} />,
        cell: ({ row }) => (
          // The number that decides whether a customer can buy, so it is the
          // one that carries the low-stock signal. The badges come first so
          // the figure itself stays on the column's aligned edge.
          <span className="inline-flex items-center gap-2">
            {row.original.low && <StatusBadge tone="danger">{t("low")}</StatusBadge>}
            {!row.original.tracked && <StatusBadge tone="info">{t("untracked")}</StatusBadge>}
            <span className={cn("tabular-nums font-medium", row.original.low && "text-danger")}>
              {format.number(row.original.available)}
            </span>
          </span>
        ),
      },
      {
        id: "incoming",
        meta: { align: "end" },
        accessorFn: (row) => row.incoming,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.incoming")} />,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{format.number(row.original.incoming)}</span>
        ),
      },
      {
        id: "reorderPoint",
        meta: { align: "end" },
        accessorFn: (row) => row.reorderPoint,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.reorderPoint")} />,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{format.number(row.original.reorderPoint)}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        cell: ({ row }) => (
          <StockActions
            variantId={row.original.variantId}
            sku={row.original.sku}
            onHand={row.original.onHand}
            canWrite={canWrite}
          />
        ),
      },
    ],
    [t, format, canWrite],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchColumnId="product"
      columnLabels={{
        product: t("columns.product"),
        onHand: t("columns.onHand"),
        reserved: t("columns.reserved"),
        available: t("columns.available"),
        incoming: t("columns.incoming"),
        reorderPoint: t("columns.reorderPoint"),
      }}
      initialSorting={[{ id: "available", desc: false }]}
      emptyState={
        <EmptyState icon={WarehouseIcon} title={t("empty.title")} description={t("empty.description")} />
      }
    />
  );
}
