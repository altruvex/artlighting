import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { ADMIN_ROLES } from "@/lib/permissions";
import { BriefcaseIcon, CalculatorIcon, ShieldCheckIcon, WrenchIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import TeamManager, { type TeamRow } from "./team-manager";

const TeamPage = async () => {
  const manager = await requirePermissionOrRedirect("staff:manage");
  const t = await getTranslations("Team");

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      // No sign-in left means their access was revoked; the row stays for history.
      _count: { select: { accounts: true, ownedQuotations: { where: { status: { in: ["DRAFT", "SENT"] } } } } },
    },
  });

  const rows: TeamRow[] = admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt,
    isCurrent: admin.id === manager.id,
    revoked: admin._count.accounts === 0,
    openQuotations: admin._count.ownedQuotations,
  }));

  const active = rows.filter((row) => !row.revoked);
  const count = (role: (typeof ADMIN_ROLES)[number]) => active.filter((row) => row.role === role).length;
  const icons = { MANAGER: ShieldCheckIcon, SALES: BriefcaseIcon, ENGINEERING: WrenchIcon, ACCOUNTS: CalculatorIcon } as const;

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_ROLES.map((role) => (
          <StatCard key={role} label={t(`rolesPlural.${role}`)} value={count(role)} icon={icons[role]} />
        ))}
      </div>

      <TeamManager admins={rows} />
    </PageShell>
  );
};

export default TeamPage;
