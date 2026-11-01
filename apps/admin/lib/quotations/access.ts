import "server-only";
import { prisma } from "@repo/database";
import type { CurrentAdmin } from "@/lib/auth";
import { ActionError } from "@/lib/actions/result";
import { getTranslations } from "next-intl/server";
import { canEditQuotation, quotationScope } from "./policy";

export { canEditQuotation, logQuotationActivity, quotationScope } from "./policy";

/** The quotation, if this admin may change it; the reason they may not, otherwise. */
export async function quotationForWrite(admin: CurrentAdmin, quotationId: string) {
  const t = await getTranslations("Quotations.errors");
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, ...quotationScope(admin) },
    select: { id: true, number: true, status: true, ownerId: true, grandTotal: true, _count: { select: { lines: true } } },
  });
  if (!quotation) throw new ActionError(t("notFound"));
  if (!canEditQuotation(admin, quotation.ownerId)) throw new ActionError(t("notOwner"));
  return quotation;
}
