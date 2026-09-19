import DashboardHeader from "@/components/dashboard-header";
import { requireAdminOrRedirect } from "@/lib/auth";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellDot } from "lucide-react";
import { getTranslations } from "next-intl/server";

const NotificationPage = async () => {
  await requireAdminOrRedirect();
  const t = await getTranslations("Notifications");
  const tNav = await getTranslations("Nav");

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("notifications")} />
      <div className="mt-8">
        <Container>
          <Card className="glass-surface rounded-2xl max-w-lg">
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BellDot className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("placeholder")}
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default NotificationPage;
