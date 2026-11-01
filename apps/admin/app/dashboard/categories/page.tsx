import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { FolderTreeIcon, LayersIcon, PackageIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import CategoriesManager from "./categories-manager";

const CategoriesPage = async () => {
  await requireAdminOrRedirect();
  const [t, locale] = await Promise.all([getTranslations("Categories"), getLocale()]);

  const rawCategories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    include: {
      _count: { select: { products: true, subProducts: true } },
      translations: { where: { language: locale }, select: { name: true } },
    },
  });

  // `name` stays the canonical value the storefront and slugs use and the
  // one the edit form writes; the translated name is shown as the label.
  const categories = rawCategories.map(({ translations, ...category }) => ({
    ...category,
    localizedName: translations[0]?.name ?? null,
  }));

  const sections = categories.filter((category) => category.parentId === null);
  const productCount = sections.reduce((sum, section) => sum + section._count.products, 0);

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("stats.sections")} value={sections.length} icon={FolderTreeIcon} />
        <StatCard
          label={t("stats.subcategories")}
          value={categories.length - sections.length}
          icon={LayersIcon}
        />
        <StatCard label={t("stats.products")} value={productCount} icon={PackageIcon} />
      </div>

      <CategoriesManager categories={categories} />
    </PageShell>
  );
};

export default CategoriesPage;
