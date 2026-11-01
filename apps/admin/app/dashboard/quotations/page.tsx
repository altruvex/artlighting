import { parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@repo/ui/components/button";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { quotationScope } from "@/lib/quotations/access";
import { QUOTATION_STATUSES, type CustomerSnapshot, type QuotationStatus } from "@/lib/quotations/schema";
import { expireStaleQuotations } from "@/lib/quotations/server";
import { toDateInput } from "@/lib/quotations/view";
import { type Prisma, prisma } from "@repo/database";
import { formatMoney, serializeMoney } from "@repo/money";
import { CheckCircle2Icon, FileTextIcon, PlusIcon, SendIcon, TrophyIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { QuotationsTable, type QuotationRow } from "./quotations-table";

/** Columns a URL may sort by, mapped to what they order on. */
const SORTABLE = {
  number: (d: Prisma.SortOrder) => ({ number: d }),
  status: (d: Prisma.SortOrder) => ({ status: d }),
  owner: (d: Prisma.SortOrder) => ({ owner: { name: d } }),
  // The row shows the snapshot's company, else its contact name. Prisma cannot
  // order by that JSON, so this orders by the live customer the same way:
  // companies by name, then people without a company (desc is the exact
  // reverse). A customer renamed after a quotation was sent sorts by the new name.
  customer: (d: Prisma.SortOrder) => [
    { customer: { companyName: { sort: d, nulls: d === "asc" ? "last" : "first" } } },
    { customer: { name: d } },
    { id: d },
  ],
  issueDate: (d: Prisma.SortOrder) => ({ issueDate: d }),
  validUntil: (d: Prisma.SortOrder) => ({ validUntil: d }),
  lines: (d: Prisma.SortOrder) => ({ lines: { _count: d } }),
  total: (d: Prisma.SortOrder) => ({ grandTotal: d }),
} satisfies Record<
  string,
  (d: Prisma.SortOrder) => Prisma.QuotationOrderByWithRelationInput | Prisma.QuotationOrderByWithRelationInput[]
>;

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const admin = await requirePermissionOrRedirect("quotation:read");
  await expireStaleQuotations();
  const [t, locale] = await Promise.all([getTranslations("Quotations"), getLocale()]);
  const showOwner = can(admin.role, "quotation:readAll");

  const params = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    filterKeys: showOwner ? ["status", "owner"] : ["status"],
  });
  const statusFilter = (params.filters.status ?? []).filter((value): value is QuotationStatus =>
    (QUOTATION_STATUSES as readonly string[]).includes(value),
  );
  const ownerFilter = params.filters.owner ?? [];

  // Sales see their own quotations, and the figures above them are theirs too.
  const scope = quotationScope(admin);
  const where: Prisma.QuotationWhereInput = {
    ...scope,
    ...(statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
    ...(ownerFilter.length > 0 ? { ownerId: { in: ownerFilter } } : {}),
    ...(params.q
      ? {
          OR: [
            { number: { contains: params.q, mode: "insensitive" as const } },
            { subject: { contains: params.q, mode: "insensitive" as const } },
            { customer: { name: { contains: params.q, mode: "insensitive" as const } } },
            { customer: { companyName: { contains: params.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const orderBy = params.sort
    ? SORTABLE[params.sort.id as keyof typeof SORTABLE](params.sort.desc ? "desc" : "asc")
    : { createdAt: "desc" as const };

  const [total, quotations, byStatus, pipeline, won, owners] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      orderBy,
      ...toPrismaPagination(params),
      select: {
        id: true,
        number: true,
        status: true,
        currency: true,
        grandTotal: true,
        issueDate: true,
        validUntil: true,
        subject: true,
        // Read here for the name; the snapshot itself never reaches the browser.
        customerSnapshot: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { lines: true } },
      },
    }),
    // The cards count by status in the database, not by loading every row.
    prisma.quotation.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    // Figures are summed per currency; the cards show EGP, the house currency.
    prisma.quotation.aggregate({ where: { ...scope, status: "SENT", currency: "EGP" }, _sum: { grandTotal: true }, _count: true }),
    prisma.quotation.aggregate({ where: { ...scope, status: "ACCEPTED", currency: "EGP" }, _sum: { grandTotal: true }, _count: true }),
    // The owner filter lists everyone who owns a quotation.
    showOwner
      ? prisma.admin.findMany({
          where: { ownedQuotations: { some: {} } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
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
      owner: q.owner.name || q.owner.email,
      lineCount: q._count.lines,
    };
  });

  const countOf = (status: QuotationStatus) => byStatus.find((g) => g.status === status)?._count._all ?? 0;
  const accepted = countOf("ACCEPTED");
  const decided = accepted + countOf("REJECTED") + countOf("EXPIRED");
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
          value={countOf("DRAFT")}
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

      <QuotationsTable
        rows={rows}
        total={total}
        params={params}
        owners={owners.map((o) => ({ value: o.id, label: o.name || o.email }))}
        canWrite={canWrite}
        showOwner={showOwner}
      />
    </PageShell>
  );
}
