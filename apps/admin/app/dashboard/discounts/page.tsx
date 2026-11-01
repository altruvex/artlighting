import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { formatMoney, serializeMoney, serializeRate } from "@repo/money";
import { BadgePercentIcon, TicketIcon, TrendingDownIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DiscountsManager, type DiscountRow } from "./discounts-manager";

/** See the findMany below. */
const MAX_DISCOUNTS = 500;

export default async function DiscountsPage() {
  const admin = await requireAdminOrRedirect();
  const [t, locale] = await Promise.all([getTranslations("Discounts"), getLocale()]);

  const [discounts, activeCount, couponCount, categories, redeemed] = await Promise.all([
    prisma.discount.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      // A bounded list in practice; the cap keeps a runaway import from
      // shipping thousands of rows to the browser.
      take: MAX_DISCOUNTS,
      select: {
        id: true,
        name: true,
        type: true,
        mode: true,
        scope: true,
        rate: true,
        amount: true,
        code: true,
        minOrderValue: true,
        usageLimit: true,
        perCustomerLimit: true,
        usageCount: true,
        stackable: true,
        priority: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        // Ids only: the form names the chosen products when it opens.
        products: { select: { productId: true } },
        categories: { select: { categoryId: true } },
        families: { select: { family: true } },
        // The list names at most two targets; past that it shows a count.
        _count: {
          select: {
            products: true,
            categories: true,
            // Confirmed orders only: an unconfirmed order holds its discounts
            // without having used them.
            redemptions: { where: { order: { isCompleted: true } } },
          },
        },
      },
    }),
    // Counted in the database so the cards stay right whatever the list holds.
    prisma.discount.count({ where: { isActive: true } }),
    prisma.discount.count({ where: { mode: "COUPON" } }),
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
    productIds: discount.products.map((link) => link.productId),
    categoryIds: discount.categories.map((link) => link.categoryId),
    families: discount.families.map((link) => link.family),
    targetCount: discount._count.products + discount._count.categories + discount.families.length,
    targetNames: [] as string[],
  }));

  // Names only for the rows that show them (two targets or fewer), in one
  // query each, instead of every product name of every discount.
  const named = rows.filter((row) => row.targetCount > 0 && row.targetCount <= 2);
  const [namedProducts, namedCategories] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: named.flatMap((row) => row.productIds) } },
      select: { id: true, productName: true },
    }),
    prisma.category.findMany({
      where: { id: { in: named.flatMap((row) => row.categoryIds) } },
      select: { id: true, name: true },
    }),
  ]);
  const productName = new Map(namedProducts.map((p) => [p.id, p.productName]));
  const categoryName = new Map(namedCategories.map((c) => [c.id, c.name]));
  for (const row of named) {
    row.targetNames = [
      ...row.productIds.map((id) => productName.get(id) ?? ""),
      ...row.categoryIds.map((id) => categoryName.get(id) ?? ""),
      ...row.families.map((family) => t(`family.${family}` as const)),
    ].filter(Boolean);
  }

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
