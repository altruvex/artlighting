"use server";

import { prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logQuotationActivity, quotationForWrite, quotationScope } from "@/lib/quotations/access";
import { getQuotationProduct } from "@/lib/quotations/editor-data";
import {
  customerInputSchema,
  quotationInputSchema,
  type CustomerInput,
  type QuotationInput,
  type QuotationStatus,
} from "@/lib/quotations/schema";
import {
  allocateQuotationNumber,
  cairoToday,
  customerSnapshot,
  expireIfStale,
  totalsFor,
  type NormalizedLine,
} from "@/lib/quotations/server";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ActionError, run } from "./result";

const LIST_PATH = "/dashboard/quotations";

/** The first validation problem, in the admin's language. */
async function validationError(error: ZodError): Promise<ActionError> {
  const t = await getTranslations("Quotations.errors");
  const issue = error.issues[0];
  const key = issue?.message ?? "invalid";
  const line = issue?.path[0] === "lines" && typeof issue.path[1] === "number" ? issue.path[1] + 1 : null;
  // Zod messages are keys into Quotations.errors; an unknown one reads as generic.
  const known = t.has(key as never);
  const message = known ? t(key as never) : t("invalid");
  return new ActionError(line ? t("onLine", { line, message }) : message);
}

async function parseQuotation(input: QuotationInput) {
  const parsed = quotationInputSchema.safeParse(input);
  if (!parsed.success) throw await validationError(parsed.error);
  return parsed.data;
}

function lineRows(lines: NormalizedLine[], lineTotals: { lineTotal: string }[]) {
  return lines.map((line, position) => ({
    position,
    productId: line.productId,
    variantId: line.variantId,
    sku: line.sku,
    name: line.name,
    description: line.description,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountRate: line.discountRate,
    lineTotal: lineTotals[position]!.lineTotal,
  }));
}

/**
 * Everything a save writes besides the lines, derived in one place so a
 * create and an update can never store the totals differently.
 */
async function headerFor(data: Awaited<ReturnType<typeof parseQuotation>>) {
  const t = await getTranslations("Quotations.errors");
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new ActionError(t("customerRequired"));

  // A line that names a product must name a real one, and a variant of it.
  const productIds = [...new Set(data.lines.map((l) => l.productId).filter((id): id is string => Boolean(id)))];
  if (productIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: productIds } },
      select: { id: true, productId: true },
    });
    const found = new Set(
      (await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } })).map((p) => p.id),
    );
    for (const [index, line] of data.lines.entries()) {
      const variantOk = !line.variantId || variants.some((v) => v.id === line.variantId && v.productId === line.productId);
      if ((line.productId && !found.has(line.productId)) || !variantOk) {
        throw new ActionError(t("onLine", { line: index + 1, message: t("productMissing") }));
      }
    }
  }

  const discountValue = data.discountType ? data.discountValue : null;
  const totals = totalsFor({
    lines: data.lines,
    discountType: data.discountType,
    discountValue,
    taxRate: data.taxRate,
  });

  return {
    totals,
    header: {
      customerId: customer.id,
      currency: data.currency,
      issueDate: data.issueDate,
      validUntil: data.validUntil,
      subject: data.subject,
      discountType: data.discountType,
      discountRate: data.discountType === "PERCENTAGE" ? discountValue : null,
      discountAmount: data.discountType === "FIXED" ? discountValue : null,
      taxRate: data.taxRate,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      terms: data.terms,
      notes: data.notes,
      customerSnapshot: { ...customerSnapshot(customer) },
    },
  };
}

export async function createQuotation(input: QuotationInput) {
  return run(async () => {
    const admin = await requirePermission("quotation:write");
    const data = await parseQuotation(input);
    const { header, totals } = await headerFor(data);

    const quotation = await prisma.$transaction(async (tx) => {
      const number = await allocateQuotationNumber(tx);
      const created = await tx.quotation.create({
        data: {
          ...header,
          number,
          createdById: admin.id,
          ownerId: admin.id,
          lines: { create: lineRows(data.lines, totals.lines) },
        },
        select: { id: true },
      });
      await logQuotationActivity(tx, { quotationId: created.id, admin, action: "CREATED", detail: { number, grandTotal: totals.grandTotal } });
      return created;
    });

    revalidatePath(LIST_PATH);
    return { id: quotation.id };
  });
}

export async function updateQuotation(quotationId: string, input: QuotationInput) {
  return run(async () => {
    const admin = await requirePermission("quotation:write");
    const t = await getTranslations("Quotations.errors");
    const before = await quotationForWrite(admin, quotationId);
    const data = await parseQuotation(input);
    const { header, totals } = await headerFor(data);

    await prisma.$transaction(async (tx) => {
      // Guarded in the write itself: a quotation sent from another tab a
      // moment ago matches nothing here instead of being edited after the fact.
      const { count } = await tx.quotation.updateMany({
        where: { id: quotationId, status: "DRAFT" },
        data: header,
      });
      if (count === 0) throw new ActionError(t("notEditable"));
      await tx.quotationLine.deleteMany({ where: { quotationId } });
      await tx.quotationLine.createMany({
        data: lineRows(data.lines, totals.lines).map((row) => ({ ...row, quotationId })),
      });
      await logQuotationActivity(tx, {
        quotationId,
        admin,
        action: "UPDATED",
        detail: { grandTotal: { from: before.grandTotal.toFixed(2), to: totals.grandTotal } },
      });
    });

    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${quotationId}`);
    return { id: quotationId };
  });
}

/** Which statuses each one may move to. Anything else is refused. */
const TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

export async function setQuotationStatus(quotationId: string, to: QuotationStatus) {
  return run(async () => {
    const admin = await requirePermission("quotation:write");
    const t = await getTranslations("Quotations.errors");
    const quotation = await quotationForWrite(admin, quotationId);
    if (!TRANSITIONS[quotation.status].includes(to)) throw new ActionError(t("badTransition"));
    if (to === "SENT" && quotation._count.lines === 0) throw new ActionError(t("noLines"));

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.quotation.updateMany({
        where: { id: quotationId, status: quotation.status },
        data: {
          status: to,
          ...(to === "SENT" ? { sentAt: now } : {}),
          ...(to === "ACCEPTED" || to === "REJECTED" ? { respondedAt: now } : {}),
        },
      });
      if (count === 0) throw new ActionError(t("badTransition"));
      await logQuotationActivity(tx, { quotationId, admin, action: "STATUS_CHANGED", detail: { from: quotation.status, to } });
    });
    // The daily sweep already ran today; a quotation sent with a past date
    // would otherwise read as SENT until tomorrow's.
    if (to === "SENT") await expireIfStale(quotationId);

    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${quotationId}`);
  });
}

/**
 * A sent offer is a record, so a change is a new draft: same customer and
 * lines, a new number, fresh dates, linked back to what it revises.
 */
export async function reviseQuotation(quotationId: string) {
  return run(async () => {
    const admin = await requirePermission("quotation:write");
    const t = await getTranslations("Quotations.errors");
    await quotationForWrite(admin, quotationId);
    const source = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    if (!source) throw new ActionError(t("notFound"));

    const issueDate = cairoToday();
    const validity = Math.max(1, Math.round((source.validUntil.getTime() - source.issueDate.getTime()) / 86_400_000));
    const validUntil = new Date(issueDate.getTime() + validity * 86_400_000);

    const created = await prisma.$transaction(async (tx) => {
      const number = await allocateQuotationNumber(tx);
      const revision = await tx.quotation.create({
        data: {
          number,
          customerId: source.customerId,
          currency: source.currency,
          issueDate,
          validUntil,
          subject: source.subject,
          discountType: source.discountType,
          discountRate: source.discountRate,
          discountAmount: source.discountAmount,
          taxRate: source.taxRate,
          subtotal: source.subtotal,
          discountTotal: source.discountTotal,
          taxTotal: source.taxTotal,
          grandTotal: source.grandTotal,
          terms: source.terms,
          notes: source.notes,
          customerSnapshot: source.customerSnapshot ?? {},
          revisionOfId: source.id,
          createdById: admin.id,
          // The revision stays with whoever answers for the original.
          ownerId: source.ownerId,
          lines: {
            create: source.lines.map(({ id: _id, quotationId: _q, ...line }) => line),
          },
        },
        select: { id: true },
      });
      await logQuotationActivity(tx, { quotationId: revision.id, admin, action: "REVISED", detail: { from: source.number } });
      await logQuotationActivity(tx, { quotationId: source.id, admin, action: "REVISED", detail: { to: number } });
      return revision;
    });

    revalidatePath(LIST_PATH);
    return { id: created.id };
  });
}

export async function deleteQuotation(quotationId: string) {
  return run(async () => {
    const admin = await requirePermission("quotation:write");
    const t = await getTranslations("Quotations.errors");
    await quotationForWrite(admin, quotationId);
    const { count } = await prisma.quotation.deleteMany({ where: { id: quotationId, status: "DRAFT" } });
    if (count === 0) throw new ActionError(t("onlyDraftDelete"));
    revalidatePath(LIST_PATH);
  });
}

/**
 * Hands a quotation to another employee — a manager's call. The new owner
 * must still have access and be someone who quotes (sales or a manager).
 */
export async function assignQuotation(quotationId: string, ownerId: string) {
  return run(async () => {
    const admin = await requirePermission("quotation:manage");
    const t = await getTranslations("Quotations.errors");
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, ...quotationScope(admin) },
      select: { id: true, owner: { select: { id: true, name: true, email: true } } },
    });
    if (!quotation) throw new ActionError(t("notFound"));
    if (quotation.owner.id === ownerId) return;

    const next = await prisma.admin.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, role: true, _count: { select: { accounts: true } } },
    });
    if (!next || next._count.accounts === 0 || !can(next.role, "quotation:write")) throw new ActionError(t("assigneeInvalid"));

    await prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id: quotationId }, data: { ownerId } });
      await logQuotationActivity(tx, {
        quotationId,
        admin,
        action: "ASSIGNED",
        detail: { from: quotation.owner.name || quotation.owner.email, to: next.name || next.email },
      });
    });
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${quotationId}`);
  });
}

/**
 * What a line copies from one product, fetched when it is picked: the
 * picker's search sends labels only.
 */
export async function quotationProduct(productId: string) {
  return run(async () => {
    await requirePermission("quotation:write");
    const t = await getTranslations("Quotations.errors");
    const product = typeof productId === "string" ? await getQuotationProduct(productId) : null;
    if (!product) throw new ActionError(t("productUnavailable"));
    return product;
  });
}

export async function createCustomer(input: CustomerInput) {
  return run(async () => {
    await requirePermission("quotation:write");
    const parsed = customerInputSchema.safeParse(input);
    if (!parsed.success) throw await validationError(parsed.error);
    const customer = await prisma.customer.create({ data: parsed.data });
    return {
      id: customer.id,
      label: customer.companyName ? `${customer.companyName} — ${customer.name}` : customer.name,
      ...customerSnapshot(customer),
    };
  });
}
