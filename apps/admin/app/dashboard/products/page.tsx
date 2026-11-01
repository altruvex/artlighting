import { ilikeContains, parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { PageHeader, PageShell } from "@/components/page-header";
import { serializeMoney } from "@repo/money";
import { availableFrom, inventorySelect } from "@repo/catalog";
import { StatCard } from "@/components/stat-card";
import { Button } from "@repo/ui/components/button";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Prisma, prisma } from "@repo/database";
import { AlertTriangleIcon, CircleCheckIcon, PackageIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import BulkGenerateSheet from "./bulk-generate-sheet";
import { CatalogSheetActions } from "./catalog-sheet";
import { ProductsTable, type ProductRow } from "./products-table";

const LOW_STOCK_THRESHOLD = 5;

/** Columns a URL may sort by. `created` has no column: it is the default order. */
const SORTABLE = {
  product: (desc: boolean) => ({ productName: dir(desc) }),
  price: (desc: boolean) => ({ price: dir(desc) }),
  created: (desc: boolean) => ({ createdAt: dir(desc) }),
} satisfies Record<string, (desc: boolean) => Prisma.ProductOrderByWithRelationInput>;

/**
 * The stock column's figure in SQL: the first default variant's sellable
 * units (onHand - reserved, floored at 0, summed over locations), 0 when it
 * has none. NULL for untracked products: they have no count, so they sort
 * after every tracked one in both directions (NULLS LAST).
 */
const STOCK_SQL = Prisma.sql`CASE WHEN p."trackInventory" THEN COALESCE((
    SELECT SUM(GREATEST(0, i."onHand" - i."reserved"))
    FROM "inventory_items" i
    WHERE i."variantId" = (
      SELECT v."id" FROM "product_variants" v
      WHERE v."productId" = p."id" AND v."isDefault"
      ORDER BY v."position", v."id"
      LIMIT 1
    )
  ), 0) END`;

const STATUSES = ["active", "inactive"] as const;

function dir(desc: boolean): Prisma.SortOrder {
  return desc ? "desc" : "asc";
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const admin = await requireAdminOrRedirect();

  const params = parseTableParams(await searchParams, {
    sortableIds: [...Object.keys(SORTABLE), "stock"],
    filterKeys: ["category", "status"],
    defaultSort: { id: "created", desc: true },
  });

  const [t, locale] = await Promise.all([getTranslations("Products"), getLocale()]);

  const categoryFilter = params.filters.category ?? [];
  const statusFilter = (params.filters.status ?? []).filter((value): value is (typeof STATUSES)[number] =>
    (STATUSES as readonly string[]).includes(value),
  );
  const search = { contains: params.q, mode: "insensitive" as const };

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(categoryFilter.length > 0 ? { categoryId: { in: categoryFilter } } : {}),
    // Both statuses ticked is the same as neither.
    ...(statusFilter.length === 1 ? { isActive: statusFilter[0] === "active" } : {}),
    ...(params.q
      ? {
          OR: [
            { productId: search },
            { productName: search },
            { translations: { some: { name: search } } },
          ],
        }
      : {}),
  };

  const select = {
    id: true,
    productId: true,
    productName: true,
    price: true,
    trackInventory: true,
    isActive: true,
    featured: true,
    translations: { where: { language: locale }, select: { name: true } },
    category: { select: { id: true, name: true, translations: { where: { language: locale }, select: { name: true } } } },
    lightingtype: { select: { name: true, translations: { where: { language: locale }, select: { name: true } } } },
    // Sellable units, not units on a shelf: the products list should
    // agree with what the storefront will let a customer buy.
    variants: {
      where: { isDefault: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { inventory: inventorySelect() },
      take: 1,
    },
    images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
  } satisfies Prisma.ProductSelect;

  const desc = params.sort?.desc ?? true;
  const { skip, take } = toPrismaPagination(params);

  /**
   * Stock is computed, not a column Prisma can order by. The page's ids come
   * from SQL ordered by STOCK_SQL, under the same filters as `where` above
   * (keep the two in step); the rows then load through the usual select.
   */
  async function productsByStock() {
    const conditions = [Prisma.sql`p."deletedAt" IS NULL`];
    if (categoryFilter.length > 0) conditions.push(Prisma.sql`p."categoryId" IN (${Prisma.join(categoryFilter)})`);
    if (statusFilter.length === 1) conditions.push(Prisma.sql`p."isActive" = ${statusFilter[0] === "active"}`);
    if (params.q) {
      const pattern = ilikeContains(params.q);
      conditions.push(Prisma.sql`(
        p."productId" ILIKE ${pattern}
        OR p."productName" ILIKE ${pattern}
        OR EXISTS (SELECT 1 FROM "product_translations" t WHERE t."productId" = p."id" AND t."name" ILIKE ${pattern})
      )`);
    }
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id" FROM "products" p
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${STOCK_SQL} ${desc ? Prisma.sql`DESC` : Prisma.sql`ASC`} NULLS LAST, p."id"
      LIMIT ${take} OFFSET ${skip}`;
    if (ids.length === 0) return [];
    const rows = await prisma.product.findMany({ where: { id: { in: ids.map((row) => row.id) } }, select });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap(({ id }) => byId.get(id) ?? []);
  }

  const [products, filteredCount, totalCount, activeCount, [low], topCategories] = await Promise.all([
    params.sort?.id === "stock"
      ? productsByStock()
      : prisma.product.findMany({
          where,
          // id breaks ties so a page boundary never repeats or skips a row.
          orderBy: [SORTABLE[(params.sort?.id ?? "created") as keyof typeof SORTABLE](desc), { id: "asc" }],
          skip,
          take,
          select,
        }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, isActive: true } }),
    // Same rule as the stock column: the default variant's sellable units
    // (onHand - reserved, floored at 0, summed over locations). Untracked
    // products have no count to run low on.
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM "products" p
      WHERE p."deletedAt" IS NULL
        AND p."trackInventory"
        AND COALESCE((
          SELECT SUM(GREATEST(0, i."onHand" - i."reserved"))
          FROM "inventory_items" i
          WHERE i."variantId" = (
            -- The one default variant the row shows (same order as the query above).
            SELECT v."id" FROM "product_variants" v
            WHERE v."productId" = p."id" AND v."isDefault"
            ORDER BY v."position", v."id"
            LIMIT 1
          )
        ), 0) <= ${LOW_STOCK_THRESHOLD}`,
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, translations: { where: { language: locale }, select: { name: true } } },
      orderBy: { order: "asc" },
    }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    sku: product.productId,
    name: product.translations[0]?.name ?? product.productName,
    categoryId: product.category.id,
    categoryLabel: [
      product.category.translations[0]?.name ?? product.category.name,
      product.lightingtype.translations[0]?.name ?? product.lightingtype.name,
    ].join(" / "),
    price: serializeMoney(product.price),
    stock: availableFrom(product.variants[0]?.inventory),
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    trackInventory: product.trackInventory,
    isActive: product.isActive,
    featured: product.featured,
    imageUrl: product.images[0]?.url ?? null,
  }));

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <CatalogSheetActions canWrite={can(admin.role, "price:write")} />
            <BulkGenerateSheet topCategories={topCategories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.name }))} />
            <Button asChild size="sm">
              <Link href="/dashboard/products/new">{t("newProduct")}</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.total")} value={totalCount} icon={PackageIcon} />
        <StatCard label={t("stats.active")} value={activeCount} icon={CircleCheckIcon} />
        <StatCard
          label={t("stats.lowStock")}
          value={low?.n ?? 0}
          hint={t("stats.lowStockHint", { threshold: LOW_STOCK_THRESHOLD })}
          icon={AlertTriangleIcon}
        />
      </div>

      <ProductsTable
        products={rows}
        total={filteredCount}
        params={params}
        categories={topCategories.map((c) => ({ id: c.id, label: c.translations[0]?.name ?? c.name }))}
        canEditPrices={can(admin.role, "price:write")}
        canEditProducts={can(admin.role, "product:write")}
      />
    </PageShell>
  );
}
