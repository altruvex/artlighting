import DashboardHeader from "@/components/dashboard-header";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";
import DiscountsManager from "./discounts-manager";

const DiscountsPage = async () => {
  const admin = await requireAdminOrRedirect();
  const tNav = await getTranslations("Nav");

  const [discounts, categories] = await Promise.all([
    prisma.discount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { productName: true } }, category: { select: { name: true } } },
    }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("discounts")} />
      <div className="mt-8">
        <DiscountsManager discounts={discounts} categories={categories} isOwner={admin.role === "owner"} />
      </div>
    </div>
  );
};

export default DiscountsPage;
