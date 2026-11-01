import { ilikeContains, parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Prisma, prisma } from "@repo/database";
import { AlertTriangleIcon, LockIcon, WarehouseIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { InventoryTable, type InventoryRow } from "./inventory-table";

/**
 * Columns a URL may sort by, mapped to a fixed SQL expression. `available`
 * and the effective reorder point are computed, so Prisma's orderBy cannot
 * express them; the page query is raw SQL over this allow-list only.
 */
const SORTABLE = {
  product: Prisma.sql`COALESCE(t."name", p."productName")`,
  onHand: Prisma.sql`i."onHand"`,
  reserved: Prisma.sql`i."reserved"`,
  available: Prisma.sql`(i."onHand" - i."reserved")`,
  incoming: Prisma.sql`i."incoming"`,
  reorderPoint: Prisma.sql`COALESCE(i."reorderPoint", p."lowStockThreshold")`,
} as const;

type RawRow = {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
  incoming: number;
  threshold: number;
  tracked: boolean;
};

/**
 * The stock list. `available` is computed here the same way the service
 * computes it — onHand minus reserved — rather than read from a column,
 * because there is no such column on purpose.
 *
 * Only one page of rows is read; the stat cards are counts and sums the
 * database works out, not rows loaded to be added up here.
 */
export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const admin = await requireAdminOrRedirect();

  const params = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    // Lowest available first: the rows that need reordering lead the list.
    defaultSort: { id: "available", desc: false },
  });

  const [t, locale] = await Promise.all([getTranslations("Inventory"), getLocale()]);

  const from = Prisma.sql`
    FROM "inventory_items" i
    JOIN "product_variants" v ON v."id" = i."variantId"
    JOIN "products" p ON p."id" = v."productId"
    LEFT JOIN "product_translations" t ON t."productId" = p."id" AND t."language" = ${locale}`;

  const pattern = ilikeContains(params.q);
  const where = params.q
    ? Prisma.sql`WHERE (v."sku" ILIKE ${pattern} OR p."productName" ILIKE ${pattern} OR t."name" ILIKE ${pattern})`
    : Prisma.empty;

  const sortKey = (params.sort?.id ?? "available") as keyof typeof SORTABLE;
  const direction = params.sort?.desc ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  const { skip, take } = toPrismaPagination(params);

  const [items, [filtered], [low], trackedCount, reserved] = await Promise.all([
    prisma.$queryRaw<RawRow[]>`
      SELECT i."id", i."variantId", p."id" AS "productId", v."sku",
             COALESCE(t."name", p."productName") AS "name",
             i."onHand", i."reserved", i."incoming",
             COALESCE(i."reorderPoint", p."lowStockThreshold") AS "threshold",
             p."trackInventory" AS "tracked"
      ${from}
      ${where}
      ORDER BY ${SORTABLE[sortKey]} ${direction}, i."id"
      LIMIT ${take} OFFSET ${skip}`,
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n ${from} ${where}`,
    // An untracked product's count does not limit a sale, so it is never on
    // the reorder list. Same rule as the row's `low` flag below.
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM "inventory_items" i
      JOIN "product_variants" v ON v."id" = i."variantId"
      JOIN "products" p ON p."id" = v."productId"
      WHERE p."trackInventory"
        AND i."onHand" - i."reserved" <= COALESCE(i."reorderPoint", p."lowStockThreshold")`,
    prisma.inventoryItem.count(),
    prisma.inventoryItem.aggregate({ _sum: { reserved: true } }),
  ]);

  const rows: InventoryRow[] = items.map((item) => {
    const available = item.onHand - item.reserved;
    return {
      id: item.id,
      variantId: item.variantId,
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      onHand: item.onHand,
      reserved: item.reserved,
      available,
      incoming: item.incoming,
      reorderPoint: item.threshold,
      tracked: item.tracked,
      low: item.tracked && available <= item.threshold,
    };
  });

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.tracked")} value={trackedCount} icon={WarehouseIcon} />
        <StatCard label={t("stats.lowStock")} value={low?.n ?? 0} icon={AlertTriangleIcon} />
        <StatCard label={t("stats.reserved")} value={reserved._sum.reserved ?? 0} icon={LockIcon} />
      </div>

      <InventoryTable
        rows={rows}
        total={filtered?.n ?? 0}
        params={params}
        canWrite={can(admin.role, "stock:write")}
      />
    </PageShell>
  );
}
