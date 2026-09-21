import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { AlertTriangleIcon, LockIcon, WarehouseIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { InventoryTable, type InventoryRow } from "./inventory-table";

/**
 * The stock list. `available` is computed here the same way the service
 * computes it — onHand minus reserved — rather than read from a column,
 * because there is no such column on purpose.
 */
export default async function InventoryPage() {
  const admin = await requireAdminOrRedirect();

  const [t, locale] = await Promise.all([getTranslations("Inventory"), getLocale()]);

  const items = await prisma.inventoryItem.findMany({
    include: {
      location: { select: { code: true } },
      variant: {
        select: {
          id: true,
          sku: true,
          product: {
            select: {
              id: true,
              productName: true,
              lowStockThreshold: true,
              trackInventory: true,
              translations: { where: { language: locale }, select: { name: true }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { variant: { sku: "asc" } },
  });

  const rows: InventoryRow[] = items.map((item) => {
    const available = item.onHand - item.reserved;
    const threshold = item.reorderPoint ?? item.variant.product.lowStockThreshold;
    return {
      id: item.id,
      variantId: item.variant.id,
      productId: item.variant.product.id,
      sku: item.variant.sku,
      name: item.variant.product.translations[0]?.name ?? item.variant.product.productName,
      locationCode: item.location.code,
      onHand: item.onHand,
      reserved: item.reserved,
      available,
      incoming: item.incoming,
      reorderPoint: threshold,
      tracked: item.variant.product.trackInventory,
      // An untracked product's count does not limit a sale, so it is never
      // on the reorder list.
      low: item.variant.product.trackInventory && available <= threshold,
    };
  });

  const lowCount = rows.filter((row) => row.low).length;
  const reservedTotal = rows.reduce((total, row) => total + row.reserved, 0);

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.tracked")} value={rows.length} icon={WarehouseIcon} />
        <StatCard label={t("stats.lowStock")} value={lowCount} icon={AlertTriangleIcon} />
        <StatCard label={t("stats.reserved")} value={reservedTotal} icon={LockIcon} />
      </div>

      <InventoryTable rows={rows} canWrite={can(admin.role, "product:write")} />
    </PageShell>
  );
}
