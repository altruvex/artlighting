import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { CalendarClockIcon, PercentIcon, TicketIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DiscountsManager, { type DiscountRow, type DiscountState } from "./discounts-manager";

/**
 * The live state of a discount, resolved on the server so the table never
 * depends on the viewer's clock (and never mismatches between render passes).
 */
function resolveState(discount: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): DiscountState {
  const now = Date.now();
  if (!discount.isActive) return "stopped";
  if (discount.endsAt && discount.endsAt.getTime() < now) return "expired";
  if (discount.startsAt && discount.startsAt.getTime() > now) return "scheduled";
  return "active";
}

const DiscountsPage = async () => {
  const admin = await requireAdminOrRedirect();
  const t = await getTranslations("Discounts");

  const [discounts, categories] = await Promise.all([
    prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { productName: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: DiscountRow[] = discounts.map((discount) => ({
    id: discount.id,
    type: discount.type,
    scope: discount.scope,
    value: discount.value,
    code: discount.code,
    targetName:
      discount.scope === "category"
        ? (discount.category?.name ?? null)
        : discount.scope === "product"
          ? (discount.product?.productName ?? null)
          : null,
    state: resolveState(discount),
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    createdAt: discount.createdAt,
  }));

  const runningCount = rows.filter((row) => row.state === "active").length;
  const scheduledCount = rows.filter((row) => row.state === "scheduled").length;

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("stats.active")} value={runningCount} icon={PercentIcon} />
        <StatCard label={t("stats.scheduled")} value={scheduledCount} icon={CalendarClockIcon} />
        <StatCard label={t("stats.total")} value={rows.length} icon={TicketIcon} />
      </div>

      <DiscountsManager
        discounts={rows}
        categories={categories}
        isOwner={can(admin.role, "discount:write")}
      />
    </PageShell>
  );
};

export default DiscountsPage;
