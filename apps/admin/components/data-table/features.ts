import type { ColumnDef } from "@tanstack/react-table";
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludesSome,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * Per-column presentation both admin tables read. `align: "end"` is for
 * figures — amounts, counts, quantities — so a column of numbers lines up on
 * its last digit and the header sits over it (end, so it follows RTL).
 */
export interface AdminColumnMeta {
  align?: "end";
}

/**
 * Features every admin table uses, registered explicitly (v9 no longer
 * bundles them). Adding one here is what makes its APIs exist on the table.
 */
export const adminTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    includesString: filterFn_includesString,
    arrIncludesSome: filterFn_arrIncludesSome,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
  // Type-only slot: types `columnDef.meta` as AdminColumnMeta.
  columnMeta: {} as AdminColumnMeta,
});

export type AdminTableFeatures = typeof adminTableFeatures;

/** Column definition for any admin table. */
export type AdminColumn<TData extends Record<string, unknown>> = ColumnDef<AdminTableFeatures, TData, unknown>;
