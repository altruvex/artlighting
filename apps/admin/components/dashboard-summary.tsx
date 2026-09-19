"use client";

import { DollarSign, Users, ShoppingBag } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import SummaryCard from "./summary-card";

const DashboardSummary = ({
  totalSales,
  totalCustomers,
  totalOrders,
}: {
  totalSales: number | null;
  totalCustomers: number;
  totalOrders: number;
}) => {
  const t = useTranslations("Summary");
  const format = useFormatter();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SummaryCard
        title={t("totalSales")}
        description={t("totalSalesDescription")}
        value={format.number(totalSales ?? 0, { style: "currency", currency: "EGP" })}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <SummaryCard
        title={t("customers")}
        description={t("customersDescription")}
        value={format.number(totalCustomers)}
        icon={<Users className="h-4 w-4" />}
      />
      <SummaryCard
        title={t("orders")}
        description={t("ordersDescription")}
        value={format.number(totalOrders)}
        icon={<ShoppingBag className="h-4 w-4" />}
      />
    </div>
  );
};

export default DashboardSummary;
