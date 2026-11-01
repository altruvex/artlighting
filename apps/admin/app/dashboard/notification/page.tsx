import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui/components/card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { BellIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NotificationPage() {
  await requireAdminOrRedirect();
  const t = await getTranslations("Notifications");

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card className="py-0">
        <CardContent className="px-0">
          <EmptyState icon={BellIcon} title={t("emptyTitle")} description={t("placeholder")} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
