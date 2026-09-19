import DashboardHeader from "@/components/dashboard-header";
import { requireOwnerOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";
import TeamManager from "./team-manager";

const TeamPage = async () => {
  const owner = await requireOwnerOrRedirect();
  const tNav = await getTranslations("Nav");

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("team")} />
      <div className="mt-8">
        <TeamManager admins={admins} currentAdminId={owner.id} />
      </div>
    </div>
  );
};

export default TeamPage;
