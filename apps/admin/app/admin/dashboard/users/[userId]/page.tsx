import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserAvatar from "@/components/user-avatar";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CircleCheckIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserClient, type CustomerOrderRow } from "./user-client";

/** One labelled field inside the profile / address cards. */
function Field({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}

const UserPage = async ({ params }: { params: Promise<{ userId: string }> }) => {
  await requireAdminOrRedirect();
  const resolvedParams = await params;

  const [t, tCommon, format] = await Promise.all([
    getTranslations("CustomerDetail"),
    getTranslations("Common"),
    getFormatter(),
  ]);

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: resolvedParams.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        shippingAddress: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            productName: true,
            productImages: true,
            quantity: true,
            totalPrice: true,
            status: true,
            isCompleted: true,
            createdAt: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return (
      <PageShell>
        <PageHeader title={t("loadError")} />
        <div className="rounded-lg border">
          <EmptyState icon={AlertTriangleIcon} title={t("loadError")} />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return notFound();
  }

  const orders: CustomerOrderRow[] = user.orders.map((order) => ({
    id: order.id,
    productName: order.productName,
    imageUrl: order.productImages[0] ?? null,
    quantity: order.quantity,
    total: order.totalPrice,
    status: order.status,
    createdAt: order.createdAt,
  }));

  const completedOrders = user.orders.filter((order) => order.isCompleted);
  const lifetimeValue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const lastOrderAt = user.orders[0]?.createdAt ?? null;

  const fullName = user.shippingAddress?.fullName?.trim() || user.name?.trim() || null;
  const phone = user.shippingAddress?.phoneNumber ?? user.phoneNumber ?? null;
  const postalAddress = user.shippingAddress
    ? [
        user.shippingAddress.address,
        user.shippingAddress.city,
        user.shippingAddress.state,
        user.shippingAddress.zipCode,
        user.shippingAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <PageShell>
      <PageHeader
        title={fullName ?? user.email}
        description={
          <span dir="ltr" className="break-all">
            {user.email}
          </span>
        }
        actions={
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <Link href="/admin/dashboard/users">
              <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
              {t("backToCustomers")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.orders")} value={orders.length} icon={ShoppingBagIcon} />
        <StatCard
          label={t("stats.completed")}
          value={completedOrders.length}
          icon={CircleCheckIcon}
        />
        <StatCard
          label={t("stats.lifetimeValue")}
          value={format.number(lifetimeValue, { style: "currency", currency: "EGP" })}
          hint={t("lifetimeValueHint")}
          icon={WalletIcon}
        />
        <StatCard
          label={t("stats.lastOrder")}
          value={lastOrderAt ? format.dateTime(lastOrderAt, { dateStyle: "medium" }) : t("noValue")}
          icon={CalendarIcon}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={fullName} email={user.email} size="lg" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{fullName ?? t("noValue")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("memberSince", {
                    date: format.dateTime(user.createdAt, { month: "short", year: "numeric" }),
                  })}
                </p>
              </div>
            </div>
            <dl className="space-y-2.5 border-t pt-3">
              <Field label={t("fullName")} value={fullName} />
              <Field label={tCommon("email")} value={user.email} ltr />
              <Field label={tCommon("phone")} value={phone} ltr />
              <Field
                label={tCommon("date")}
                value={format.dateTime(user.createdAt, { dateStyle: "medium" })}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 lg:col-span-2">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{t("addresses")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {postalAddress ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("shippingAddress")}
                  </h2>
                  <dl className="space-y-2.5">
                    <Field label={t("fullName")} value={fullName} />
                    <Field label={tCommon("phone")} value={phone} ltr />
                    <Field label={t("addresses")} value={postalAddress} />
                  </dl>
                </section>
                <section className="space-y-2 sm:border-s sm:ps-4">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("billingAddress")}
                  </h2>
                  <dl className="space-y-2.5">
                    <Field label={tCommon("email")} value={user.email} ltr />
                    <Field label={tCommon("phone")} value={phone} ltr />
                    <Field label={t("addresses")} value={postalAddress} />
                  </dl>
                </section>
              </div>
            ) : (
              <EmptyState title={t("noAddress")} className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">{t("orderHistory")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("orderHistoryDescription")}</p>
        </CardHeader>
        <CardContent className="px-4">
          <UserClient orders={orders} />
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default UserPage;
