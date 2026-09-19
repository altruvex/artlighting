import DashboardHeader from "@/components/dashboard-header";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";
import CategoriesManager from "./categories-manager";

const CategoriesPage = async () => {
  await requireAdminOrRedirect();
  const tNav = await getTranslations("Nav");

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    include: { _count: { select: { products: true, subProducts: true } } },
  });

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("categories")} />
      <div className="mt-8">
        <CategoriesManager categories={categories} />
      </div>
    </div>
  );
};

export default CategoriesPage;
