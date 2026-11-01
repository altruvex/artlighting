import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { formatMoney, serializeMoney, serializeRate } from "@repo/money";
import { BadgePercentIcon, TicketIcon, TrendingDownIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DiscountsManager, type DiscountRow } from "./discounts-manager";

export default async function DiscountsPage() {
  const admin = await requireAdminOrRedirect();
  const [t, locale] = await Promise.all([getTranslations("Discounts"), getLocale()]);

  const [discounts, products, categories, redeemed] = await Promise.all([
    prisma.discount.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        products: { select: { product: { select: { id: true, productName: true } } } },
        categories: { select: { category: { select: { id: true, name: true } } } },
        families: { select: { family: true } },
        // Confirmed orders only: an unconfirmed order holds its discounts
        // without having used them.
        _count: { select: { redemptions: { where: { order: { isCompleted: true } } } } },
      },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, productId: true, productName: true, translations: { where: { language: locale }, select: { name: true } } },
      orderBy: { productId: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, parentId: true, translations: { where: { language: locale }, select: { name: true } } },
      orderBy: { order: "asc" },
    }),
    // What the promotions have actually cost, which is the number that
    // decides whether one was worth running.
    prisma.discountRedemption.aggregate({
      where: { order: { isCompleted: true } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const rows: DiscountRow[] = discounts.map((discount) => ({
    id: discount.id,
    name: discount.name,
    type: discount.type,
    mode: discount.mode,
    scope: discount.scope,
    rate: discount.rate == null ? null : serializeRate(discount.rate),
    amount: discount.amount == null ? null : serializeMoney(discount.amount),
    code: discount.code,
    minOrderValue: discount.minOrderValue == null ? null : serializeMoney(discount.minOrderValue),
    usageLimit: discount.usageLimit,
    perCustomerLimit: discount.perCustomerLimit,
    usageCount: discount.usageCount,
    redemptionCount: discount._count.redemptions,
    stackable: discount.stackable,
    priority: discount.priority,
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    isActive: discount.isActive,
    productIds: discount.products.map((link) => link.product.id),
    categoryIds: discount.categories.map((link) => link.category.id),
    families: discount.families.map((link) => link.family),
    targetNames: [
      ...discount.products.map((link) => link.product.productName),
      ...discount.categories.map((link) => link.category.name),
      ...discount.families.map((link) => t(`family.${link.family}` as const)),
    ],
  }));

  const activeCount = rows.filter((row) => row.isActive).length;
  const couponCount = rows.filter((row) => row.mode === "COUPON").length;

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.active")} value={activeCount} icon={BadgePercentIcon} />
        <StatCard label={t("stats.coupons")} value={couponCount} icon={TicketIcon} />
        <StatCard
          label={t("stats.given")}
          value={formatMoney(redeemed._sum.amount ?? 0, { locale })}
          hint={t("stats.givenHint", { count: redeemed._count._all })}
          icon={TrendingDownIcon}
        />
      </div>

      <DiscountsManager
        discounts={rows}
        products={products.map((product) => ({
          id: product.id,
          label: product.translations[0]?.name ?? product.productName,
          sku: product.productId,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.translations[0]?.name ?? category.name,
          isChild: category.parentId !== null,
        }))}
        canWrite={can(admin.role, "discount:write")}
      />
    </PageShell>
  );
}
