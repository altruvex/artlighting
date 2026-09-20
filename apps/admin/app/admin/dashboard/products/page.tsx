import { PageHeader, PageShell } from "@/components/page-header";
import { serializeMoney } from "@repo/money";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { AlertTriangleIcon, CircleCheckIcon, PackageIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import BulkGenerateSheet from "./bulk-generate-sheet";
import { CatalogSheetActions } from "./catalog-sheet";
import { ProductsTable, type ProductRow } from "./products-table";

const LOW_STOCK_THRESHOLD = 5;

export default async function ProductsPage() {
  const admin = await requireAdminOrRedirect();

  const [t, locale] = await Promise.all([getTranslations("Products"), getLocale()]);

  const [products, topCategories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        translations: { where: { language: locale }, select: { name: true } },
        category: { select: { id: true, name: true, translations: { where: { language: locale }, select: { name: true } } } },
        lightingtype: { select: { name: true, translations: { where: { language: locale }, select: { name: true } } } },
        variants: { where: { isDefault: true }, select: { stock: true } },
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
      },
    }),
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
    stock: product.variants[0]?.stock ?? product.quantity,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    isActive: product.isActive,
    featured: product.featured,
    imageUrl: product.images[0]?.url ?? product.productImages[0] ?? null,
  }));

  const activeCount = rows.filter((row) => row.isActive).length;
  const lowStockCount = rows.filter((row) => row.stock <= LOW_STOCK_THRESHOLD).length;

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
              <Link href="/admin/dashboard/products/new">{t("newProduct")}</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.total")} value={rows.length} icon={PackageIcon} />
        <StatCard label={t("stats.active")} value={activeCount} icon={CircleCheckIcon} />
        <StatCard
          label={t("stats.lowStock")}
          value={lowStockCount}
          hint={t("stats.lowStockHint", { threshold: LOW_STOCK_THRESHOLD })}
          icon={AlertTriangleIcon}
        />
      </div>

      <ProductsTable
        products={rows}
        categories={topCategories.map((c) => ({ id: c.id, label: c.translations[0]?.name ?? c.name }))}
        canEditPrices={can(admin.role, "price:write")}
      />
    </PageShell>
  );
}
