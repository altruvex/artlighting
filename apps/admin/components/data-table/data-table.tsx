"use client";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
  flexRender,
  useTable,
} from "@tanstack/react-table";
import { type AdminColumn, adminTableFeatures } from "./features";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, SettingsIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { FacetedFilter, type FacetOption } from "./faceted-filter";

export interface DataTableFacet {
  columnId: string;
  title: string;
  options: FacetOption[];
}

/**
 * The one table used across the admin: search, faceted filters, sorting,
 * column visibility, optional row selection with bulk actions, pagination.
 *
 * Filtering and sorting run client-side. That's right for today's volumes
 * (a few hundred rows); when a list outgrows it, swap in server-side
 * pagination behind the same props.
 */
export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder,
  facets = [],
  bulkActions,
  emptyState,
  columnLabels = {},
  initialPageSize = 25,
  initialSorting = [],
}: {
  columns: AdminColumn<TData>[];
  data: TData[];
  searchColumnId?: string;
  searchPlaceholder?: string;
  facets?: DataTableFacet[];
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode;
  emptyState?: ReactNode;
  /** Human labels for the column-visibility menu, keyed by column id. */
  columnLabels?: Record<string, string>;
  initialPageSize?: number;
  initialSorting?: SortingState;
}) {
  const t = useTranslations("DataTable");
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const selectable = Boolean(bulkActions);
  const selectionColumn: AdminColumn<TData> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        aria-label={t("selectAll")}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        aria-label={t("selectRow")}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const table = useTable({
    features: adminTableFeatures,
    data,
    columns: selectable ? [selectionColumn, ...columns] : columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });

  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;
  const isFiltered = columnFilters.length > 0 || Boolean(searchColumn?.getFilterValue());
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchColumn && (
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <SearchIcon aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={(searchColumn.getFilterValue() as string) ?? ""}
              onChange={(event) => searchColumn.setFilterValue(event.target.value)}
              placeholder={searchPlaceholder ?? t("search")}
              aria-label={searchPlaceholder ?? t("search")}
              className="h-8 ps-8"
            />
          </div>
        )}
        {facets.map((facet) => (
          <FacetedFilter
            key={facet.columnId}
            column={table.getColumn(facet.columnId)}
            title={facet.title}
            options={facet.options}
          />
        ))}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setColumnFilters([]);
              searchColumn?.setFilterValue("");
            }}
          >
            <XIcon className="size-3.5" />
            {t("reset")}
          </Button>
        )}
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ms-auto h-8 gap-1.5">
                <SettingsIcon className="size-3.5" />
                <span className="hidden sm:inline">{t("columns")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                >
                  {columnLabels[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm tabular-nums">{t("selected", { count: selectedRows.length })}</span>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {bulkActions?.(selectedRows, () => setRowSelection({}))}
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setRowSelection({})}>
              {t("clearSelection")}
            </Button>
          </div>
        </div>
      )}

      {/* bg-card: the rows sit on the same surface as the sticky header, and
          overflow-hidden keeps that header inside the rounded corners. */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="relative max-h-[70svh] overflow-auto">
          <Table className="min-w-[720px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn("h-9 whitespace-nowrap", header.column.columnDef.meta?.align === "end" && "text-end")}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={table.getAllColumns().length} className="p-0">
                    {emptyState ?? <EmptyState title={t("empty")} />}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2",
                          cell.column.id === "select" && "w-10",
                          cell.column.columnDef.meta?.align === "end" && "text-end",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {t("showing", {
            from: table.getFilteredRowModel().rows.length === 0 ? 0 : table.state.pagination.pageIndex * table.state.pagination.pageSize + 1,
            to: Math.min(
              (table.state.pagination.pageIndex + 1) * table.state.pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            ),
            total: table.getFilteredRowModel().rows.length,
          })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t("previous")}</span>
          </Button>
          <span className="px-2 tabular-nums">
            {t("page", { page: table.state.pagination.pageIndex + 1, pages: Math.max(table.getPageCount(), 1) })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="hidden sm:inline">{t("next")}</span>
            <ChevronRightIcon className="size-4 rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
