"use client";

import { type AdminColumn, ServerDataTable, type TableParams } from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { BulkPriceDialog } from "./bulk-price-dialog";
import { BulkTrackInventory } from "./bulk-track-inventory";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export interface ProductRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  /** Serialized money (see @repo/money): a string, never a float. */
  price: string;
  stock: number;
  lowStockThreshold: number;
  /** False: made or bought in to order; orders do not reserve its stock. */
  trackInventory: boolean;
  isActive: boolean;
  featured: boolean;
  imageUrl: string | null;
}

export function ProductsTable({
  products,
  total,
  params,
  categories,
  canEditPrices,
  canEditProducts,
}: {
  /** One page of rows; the server does the search, filters and sort. */
  products: ProductRow[];
  /** Rows matching the search and filters, across every page. */
  total: number;
  params: TableParams;
  categories: { id: string; label: string }[];
  /** ADMIN only: price:write. */
  canEditPrices: boolean;
  /** product:write — staff have it; turns on the inventory-tracking bulk action. */
  canEditProducts: boolean;
}) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  // STAFF without either write permission never gets a checkbox they could
  // not act on.
  const selectable = canEditPrices || canEditProducts;

  const columns = useMemo<AdminColumn<ProductRow>[]>(
    () => [
      {
        id: "product",
        // The row's identity; every other column can be hidden.
        enableHiding: false,
        accessorFn: (row) => `${row.name} ${row.sku}`,
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
            <span className="grid min-w-0 leading-tight">
              <Link
                href={`/dashboard/products/${row.original.id}`}
                prefetch={false}
                className="truncate font-medium hover:underline"
              >
                {row.original.name}
              </Link>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {row.original.sku}
              </span>
            </span>
          </div>
        ),
      },
      {
        id: "category",
        accessorFn: (row) => row.categoryId,
        enableSorting: false,
        header: t("columns.category"),
        cell: ({ row }) => <span className="text-sm">{row.original.categoryLabel}</span>,
      },
      {
        id: "price",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.price),
        header: tCommon("price"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.price, { locale })}
          </span>
        ),
      },
      {
        id: "stock",
        meta: { align: "end" },
        accessorFn: (row) => row.stock,
        // Sorted on the server by the same sellable-units rule (page.tsx).
        header: t("columns.stock"),
        cell: ({ row }) => {
          const { stock, lowStockThreshold, trackInventory } = row.original;
          // Untracked stock is never "out" or "low": it does not limit a sale.
          if (!trackInventory) return <StatusBadge tone="info">{t("stock.untracked")}</StatusBadge>;
          const tone = stock === 0 ? "danger" : stock <= lowStockThreshold ? "warning" : "neutral";
          const label = stock === 0 ? t("stock.out") : stock <= lowStockThreshold ? t("stock.low", { count: stock }) : String(stock);
          return tone === "neutral" ? (
            <span className="tabular-nums">{label}</span>
          ) : (
            <StatusBadge tone={tone}>{label}</StatusBadge>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "active" : "inactive"),
        enableSorting: false,
        header: tCommon("status"),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>
              {row.original.isActive ? tCommon("active") : tCommon("inactive")}
            </StatusBadge>
            {row.original.featured && <StatusBadge tone="info">{t("featured")}</StatusBadge>}
          </div>
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
              <Link href={`/dashboard/products/${row.original.id}`} prefetch={false}>
                {tCommon("edit")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t, tCommon, locale],
  );

  return (
    <ServerDataTable
      columns={columns}
      data={products}
      total={total}
      params={params}
      searchPlaceholder={t("searchPlaceholder")}
      columnMenu
      columnStorageKey="admin.products.columns"
      bulkActions={
        selectable
          ? (selected, clear) => (
              <>
                {canEditProducts && <BulkTrackInventory selected={selected} clear={clear} />}
                {canEditPrices && <BulkPriceDialog selected={selected} clear={clear} />}
              </>
            )
          : undefined
      }
      facets={[
        {
          key: "category",
          title: t("columns.category"),
          options: categories.map((category) => ({ value: category.id, label: category.label })),
        },
        {
          key: "status",
          title: tCommon("status"),
          options: [
            { value: "active", label: tCommon("active") },
            { value: "inactive", label: tCommon("inactive") },
          ],
        },
      ]}
      emptyState={
        <EmptyState
          icon={PackageIcon}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/products/new">{t("newProduct")}</Link>
            </Button>
          }
        />
      }
    />
  );
}
