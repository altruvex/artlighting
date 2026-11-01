import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { serializeRowMoney } from "@/lib/serialize-money";
import { prisma } from "@repo/database";
import { AlertTriangleIcon, LightbulbIcon, PlugZapIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BulbsManager, type BulbRow, type FixtureRow } from "./bulbs-manager";

/**
 * The bulb price list, and which bulbs each fixture is sold with.
 *
 * Both live on one page because they are one decision: a price here moves
 * every fixture that offers it, and a fixture that offers nothing cannot be
 * bought. Arms decide who appears in the second table — `hNumber` — not the
 * lighting type, because that is what a bulb screws into.
 */
export default async function BulbsPage() {
  const admin = await requireAdminOrRedirect();
  const [t, locale] = await Promise.all([getTranslations("Bulbs"), getLocale()]);

  const [bulbs, fixtures] = await Promise.all([
    prisma.bulb.findMany({
      select: {
        id: true,
        key: true,
        wattage: true,
        base: true,
        price: true,
        isActive: true,
        position: true,
        translations: { select: { language: true, name: true } },
        _count: { select: { products: true, configurations: true } },
      },
      orderBy: [{ position: "asc" }, { wattage: "asc" }],
    }),
    prisma.product.findMany({
      where: { hNumber: { gt: 0 } },
      select: {
        id: true,
        productId: true,
        productName: true,
        hNumber: true,
        chandelierLightingType: true,
        translations: { where: { language: locale }, select: { name: true }, take: 1 },
        bulbs: {
          select: { bulbId: true, isDefault: true, position: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { productId: "asc" },
    }),
  ]);

  // Money crosses to a Client Component as a string; a Prisma.Decimal
  // cannot (see @repo/money).
  const bulbRows: BulbRow[] = bulbs.map((bulb) => ({
    ...serializeRowMoney({ id: bulb.id, price: bulb.price }),
    key: bulb.key,
    wattage: bulb.wattage,
    base: bulb.base,
    isActive: bulb.isActive,
    position: bulb.position,
    nameEn: bulb.translations.find((row) => row.language === "en")?.name ?? "",
    nameAr: bulb.translations.find((row) => row.language === "ar")?.name ?? "",
    usedByProducts: bulb._count.products,
    usedByConfigurations: bulb._count.configurations,
  }));

  const fixtureRows: FixtureRow[] = fixtures.map((product) => ({
    id: product.id,
    sku: product.productId,
    name: product.translations[0]?.name ?? product.productName,
    arms: product.hNumber ?? 0,
    // Reported, not hidden: a fixture with arms that is filed as LED is one
    // of the two that disagree, and the showroom should see which.
    lightingType: product.chandelierLightingType,
    bulbIds: product.bulbs.map((row) => row.bulbId),
    defaultBulbId: product.bulbs.find((row) => row.isDefault)?.bulbId ?? null,
  }));

  const unfitted = fixtureRows.filter((row) => row.bulbIds.length === 0).length;

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("stats.bulbs")} value={bulbRows.length} icon={LightbulbIcon} />
        <StatCard label={t("stats.fixtures")} value={fixtureRows.length} icon={PlugZapIcon} />
        <StatCard
          label={t("stats.unfitted")}
          value={unfitted}
          icon={AlertTriangleIcon}
          hint={unfitted > 0 ? t("stats.unfittedHint") : undefined}
        />
      </div>

      <BulbsManager
        bulbs={bulbRows}
        fixtures={fixtureRows}
        locale={locale}
        canWrite={can(admin.role, "price:write")}
      />
    </PageShell>
  );
}
