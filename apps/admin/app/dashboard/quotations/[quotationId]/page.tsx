import { requirePermissionOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { canEditQuotation, quotationScope } from "@/lib/quotations/access";
import { customerOptionSelect, toCustomerOption } from "@/lib/quotations/editor-data";
import { DEFAULT_TAX_RATE, DEFAULT_TERMS, DEFAULT_VALIDITY_DAYS } from "@/lib/quotations/schema";
import { expireStaleQuotations } from "@/lib/quotations/server";
import { toDateInput, type QuotationView } from "@/lib/quotations/view";
import { prisma } from "@repo/database";
import { serializeMoney, serializeRate } from "@repo/money";
import { notFound } from "next/navigation";
import { QuotationEditor } from "../quotation-editor";

export default async function QuotationPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const admin = await requirePermissionOrRedirect("quotation:read");
  const { quotationId } = await params;
  await expireStaleQuotations();

  const canAssign = can(admin.role, "quotation:manage");
  const [q, assignees] = await Promise.all([
    // Outside the admin's scope the quotation does not exist for them.
    prisma.quotation.findFirst({
      where: { id: quotationId, ...quotationScope(admin) },
      include: {
        lines: { orderBy: { position: "asc" } },
        createdBy: { select: { name: true } },
        owner: { select: { id: true, name: true, email: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 100 },
        revisionOf: { select: { id: true, number: true } },
        revisions: { select: { id: true, number: true }, orderBy: { createdAt: "asc" } },
        // Only the customer on it: the picker searches for any other on demand.
        customer: { select: customerOptionSelect },
      },
    }),
    // Who a manager can hand it to: people who quote and can still sign in.
    canAssign
      ? prisma.admin.findMany({
          where: { role: { in: ["MANAGER", "SALES"] }, accounts: { some: {} } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  if (!q) notFound();

  const quotation: QuotationView = {
    id: q.id,
    number: q.number,
    status: q.status,
    customerId: q.customerId,
    currency: q.currency,
    issueDate: toDateInput(q.issueDate),
    validUntil: toDateInput(q.validUntil),
    subject: q.subject,
    discountType: q.discountType,
    discountValue:
      q.discountType === "PERCENTAGE" && q.discountRate
        ? serializeRate(q.discountRate)
        : q.discountType === "FIXED" && q.discountAmount
          ? serializeMoney(q.discountAmount)
          : null,
    taxRate: serializeRate(q.taxRate),
    terms: q.terms,
    notes: q.notes,
    lines: q.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      sku: l.sku,
      name: l.name,
      description: l.description,
      imageUrl: l.imageUrl,
      quantity: l.quantity,
      unitPrice: serializeMoney(l.unitPrice),
      discountRate: serializeRate(l.discountRate),
    })),
    createdBy: q.createdBy.name,
    owner: { id: q.owner.id, name: q.owner.name || q.owner.email },
    activity: q.activity.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actorName,
      createdAt: a.createdAt.toISOString(),
      detail: a.detail && typeof a.detail === "object" && !Array.isArray(a.detail) ? (a.detail as Record<string, unknown>) : null,
    })),
    createdAt: q.createdAt.toISOString(),
    sentAt: q.sentAt?.toISOString() ?? null,
    respondedAt: q.respondedAt?.toISOString() ?? null,
    revisionOf: q.revisionOf,
    revisions: q.revisions,
  };

  return (
    <QuotationEditor
      key={`${q.id}:${q.updatedAt.getTime()}`}
      quotation={quotation}
      customer={toCustomerOption(q.customer)}
      canWrite={canEditQuotation(admin, q.ownerId)}
      assignees={assignees.map((a) => ({ id: a.id, name: a.name || a.email }))}
      defaults={{
        taxRate: DEFAULT_TAX_RATE,
        validityDays: DEFAULT_VALIDITY_DAYS,
        terms: DEFAULT_TERMS,
        today: toDateInput(new Date()),
      }}
    />
  );
}
