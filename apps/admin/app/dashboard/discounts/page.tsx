import { parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { type Prisma, prisma } from "@repo/database";
import { formatMoney, serializeMoney, serializeRate } from "@repo/money";
import { BadgePercentIcon, TicketIcon, TrendingDownIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DiscountsManager, type DiscountRow } from "./discounts-manager";

/** Sortable columns → Prisma order. Value and state are not stored columns
 *  (mixed rate/amount, derived state), so they are not listed. */
const SORTABLE = {
  name: (desc: Prisma.SortOrder) => ({ name: desc }),
  usage: (desc: Prisma.SortOrder) => ({ usageCount: desc }),
} satisfies Record<string, (desc: Prisma.SortOrder) => Prisma.DiscountOrderByWithRelationInput>;

const SCOPES = ["PRODUCTS", "CATEGORIES", "FAMILIES", "CART"] as const;

/**
 * The list's derived states as queries, mirroring stateOf() in the manager
 * (stopped, then used up, then scheduled, then expired, else running), so the
 * filter runs in the database over every rule, not over one page.
 */
function stateFilters(now: Date, usageLimit: Prisma.IntFieldRefInput<"Discount">): Record<string, Prisma.DiscountWhereInput> {
  const usedUp: Prisma.DiscountWhereInput = { usageLimit: { not: null }, usageCount: { gte: usageLimit } };
  const notUsedUp: Prisma.DiscountWhereInput = { OR: [{ usageLimit: null }, { usageCount: { lt: usageLimit } }] };
  const scheduled: Prisma.DiscountWhereInput = { startsAt: { gt: now } };
  const started: Prisma.DiscountWhereInput = { OR: [{ startsAt: null }, { startsAt: { lte: now } }] };
  return {
    stopped: { isActive: false },
    usedUp: { isActive: true, ...usedUp },
    scheduled: { isActive: true, AND: [notUsedUp, scheduled] },
    expired: { isActive: true, AND: [notUsedUp, started, { endsAt: { lte: now } }] },
    active: { isActive: true, AND: [notUsedUp, started, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
  };
}

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const admin = await requireAdminOrRedirect();
  const [t, locale] = await Promise.all([getTranslations("Discounts"), getLocale()]);

  const params = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    filterKeys: ["state", "scope"],
  });

  const byState = stateFilters(new Date(), prisma.discount.fields.usageLimit);
  const states = (params.filters.state ?? []).filter((value) => value in byState);
  const scopes = (params.filters.scope ?? []).filter((value): value is (typeof SCOPES)[number] =>
    (SCOPES as readonly string[]).includes(value),
  );
  const where: Prisma.DiscountWhereInput = {
    ...(states.length > 0 ? { OR: states.map((state) => byState[state]!) } : {}),
    ...(scopes.length > 0 ? { scope: { in: scopes } } : {}),
    ...(params.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: params.q, mode: "insensitive" as const } },
                { code: { contains: params.q, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : {}),
  };

  // No sort chosen: running rules first, newest first. id keeps paging stable.
  const orderBy: Prisma.DiscountOrderByWithRelationInput[] = params.sort
    ? [SORTABLE[params.sort.id as keyof typeof SORTABLE](params.sort.desc ? "desc" : "asc"), { id: "asc" }]
    : [{ isActive: "desc" }, { createdAt: "desc" }, { id: "asc" }];

  const [total, discounts, activeCount, couponCount, categories, redeemed] = await Promise.all([
    prisma.discount.count({ where }),
    prisma.discount.findMany({
      where,
      orderBy,
      ...toPrismaPagination(params),
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
        total={total}
        params={params}
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
