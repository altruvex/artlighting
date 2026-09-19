import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { ShieldCheckIcon, UserCogIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import TeamManager, { type TeamRow } from "./team-manager";

const TeamPage = async () => {
  const owner = await requirePermissionOrRedirect("staff:manage");
  const t = await getTranslations("Team");

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const rows: TeamRow[] = admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt,
    isCurrent: admin.id === owner.id,
  }));

  const adminCount = rows.filter((row) => row.role === "ADMIN").length;

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("stats.total")} value={rows.length} icon={UsersIcon} />
        <StatCard label={t("stats.admins")} value={adminCount} icon={ShieldCheckIcon} />
        <StatCard label={t("stats.staff")} value={rows.length - adminCount} icon={UserCogIcon} />
      </div>

      <TeamManager admins={rows} />
    </PageShell>
  );
};

export default TeamPage;
