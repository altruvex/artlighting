"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { BulkPriceDialog } from "./bulk-price-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PackageIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
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
  isActive: boolean;
  featured: boolean;
  imageUrl: string | null;
}

export function ProductsTable({
  products,
  categories,
  canEditPrices,
}: {
  products: ProductRow[];
  categories: { id: string; label: string }[];
  /** ADMIN only: price:write. STAFF sees the table without the selection column. */
  canEditPrices: boolean;
}) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const locale = useLocale();

  const columns = useMemo<AdminColumn<ProductRow>[]>(
    () => [
      {
        id: "product",
        accessorFn: (row) => `${row.name} ${row.sku}`,
        filterFn: "includesString",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.product")} />,
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
                href={`/admin/dashboard/products/${row.original.id}`}
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
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.category")} />,
        cell: ({ row }) => <span className="text-sm">{row.original.categoryLabel}</span>,
      },
      {
        id: "price",
        accessorFn: (row) => moneySortKey(row.price),
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("price")} />,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.price, { locale })}
          </span>
        ),
      },
      {
        id: "stock",
        accessorFn: (row) => row.stock,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.stock")} />,
        cell: ({ row }) => {
          const { stock, lowStockThreshold } = row.original;
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
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("status")} />,
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
              <Link href={`/admin/dashboard/products/${row.original.id}`} prefetch={false}>
                {tCommon("edit")}
              </Link>
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
      data={products}
      searchColumnId="product"
      searchPlaceholder={t("searchPlaceholder")}
      columnLabels={{
        product: t("columns.product"),
        category: t("columns.category"),
        price: tCommon("price"),
        stock: t("columns.stock"),
        status: tCommon("status"),
      }}
      facets={[
        {
          columnId: "category",
          title: t("columns.category"),
          options: categories.map((category) => ({ value: category.id, label: category.label })),
        },
        {
          columnId: "status",
          title: tCommon("status"),
          options: [
            { value: "active", label: tCommon("active") },
            { value: "inactive", label: tCommon("inactive") },
          ],
        },
      ]}
      // Passing bulkActions is what turns the selection column on, so STAFF
      // simply never sees a checkbox they could not act on.
      bulkActions={
        canEditPrices
          ? (selected, clear) => <BulkPriceDialog selected={selected} clear={clear} />
          : undefined
      }
      emptyState={
        <EmptyState
          icon={PackageIcon}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button asChild size="sm">
              <Link href="/admin/dashboard/products/new">{t("newProduct")}</Link>
            </Button>
          }
        />
      }
    />
  );
}
