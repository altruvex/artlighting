import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@repo/ui/components/button";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { quotationScope } from "@/lib/quotations/access";
import type { CustomerSnapshot } from "@/lib/quotations/schema";
import { expireStaleQuotations } from "@/lib/quotations/server";
import { toDateInput } from "@/lib/quotations/view";
import { prisma } from "@repo/database";
import { formatMoney, serializeMoney } from "@repo/money";
import { CheckCircle2Icon, FileTextIcon, PlusIcon, SendIcon, TrophyIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { QuotationsTable, type QuotationRow } from "./quotations-table";

export default async function QuotationsPage() {
  const admin = await requirePermissionOrRedirect("quotation:read");
  await expireStaleQuotations();
  const [t, locale] = await Promise.all([getTranslations("Quotations"), getLocale()]);

  // Sales see their own quotations, and the figures above them are theirs too.
  const scope = quotationScope(admin);
  const [quotations, pipeline, won] = await Promise.all([
    prisma.quotation.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        currency: true,
        grandTotal: true,
        issueDate: true,
        validUntil: true,
        subject: true,
        customerSnapshot: true,
        createdBy: { select: { name: true } },
        owner: { select: { name: true, email: true } },
        _count: { select: { lines: true } },
      },
    }),
    // Figures are summed per currency; the cards show EGP, the house currency.
    prisma.quotation.aggregate({ where: { ...scope, status: "SENT", currency: "EGP" }, _sum: { grandTotal: true }, _count: true }),
    prisma.quotation.aggregate({ where: { ...scope, status: "ACCEPTED", currency: "EGP" }, _sum: { grandTotal: true }, _count: true }),
  ]);

  const rows: QuotationRow[] = quotations.map((q) => {
    const customer = q.customerSnapshot as unknown as CustomerSnapshot;
    return {
      id: q.id,
      number: q.number,
      status: q.status,
      currency: q.currency,
      grandTotal: serializeMoney(q.grandTotal),
      issueDate: toDateInput(q.issueDate),
      validUntil: toDateInput(q.validUntil),
      subject: q.subject,
      customer: customer.companyName || customer.name,
      contact: customer.companyName ? customer.name : null,
      createdBy: q.createdBy.name,
      owner: q.owner.name || q.owner.email,
      lineCount: q._count.lines,
    };
  });

  const decided = rows.filter((r) => r.status === "ACCEPTED" || r.status === "REJECTED" || r.status === "EXPIRED").length;
  const accepted = rows.filter((r) => r.status === "ACCEPTED").length;
  const canWrite = can(admin.role, "quotation:write");

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite && (
            <Button asChild size="sm">
              <Link href="/dashboard/quotations/new">
                <PlusIcon aria-hidden className="size-4" />
                {t("new")}
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("stats.drafts")}
          value={rows.filter((r) => r.status === "DRAFT").length}
          icon={FileTextIcon}
        />
        <StatCard
          label={t("stats.pipeline")}
          value={formatMoney(pipeline._sum.grandTotal ?? 0, { locale })}
          hint={t("stats.pipelineHint", { count: pipeline._count })}
          icon={SendIcon}
        />
        <StatCard
          label={t("stats.won")}
          value={formatMoney(won._sum.grandTotal ?? 0, { locale })}
          hint={t("stats.wonHint", { count: won._count })}
          icon={CheckCircle2Icon}
        />
        <StatCard
          label={t("stats.winRate")}
          value={decided === 0 ? "—" : `${Math.round((accepted / decided) * 100)}%`}
          hint={t("stats.winRateHint", { count: decided })}
          icon={TrophyIcon}
        />
      </div>

      <QuotationsTable rows={rows} canWrite={canWrite} showOwner={can(admin.role, "quotation:readAll")} />
    </PageShell>
  );
}
