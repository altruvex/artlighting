import { type Prisma, type prisma, type QuotationActivityAction } from "@repo/database";
import type { AdminRole } from "@repo/database";
import { can } from "@/lib/permissions";

type Actor = { id: string; role: AdminRole };

/**
 * Who may see and change a quotation, in one place.
 *
 * Seeing: with quotation:readAll (managers, engineering, accounts) every
 * quotation; otherwise (sales) only the ones you own. A quotation outside your
 * scope does not exist for you — the pages 404 and the actions say "not
 * found", so its number and customer are not given away.
 *
 * Changing: quotation:write on a quotation you own, or quotation:manage
 * (managers) on any.
 */
export function quotationScope(admin: Actor): Prisma.QuotationWhereInput {
  return can(admin.role, "quotation:readAll") ? {} : { ownerId: admin.id };
}

export function canEditQuotation(admin: Actor, ownerId: string): boolean {
  if (can(admin.role, "quotation:manage")) return true;
  return can(admin.role, "quotation:write") && ownerId === admin.id;
}

type Db = Pick<typeof prisma, "quotationActivity">;

/**
 * Appends one line to a quotation's history. The name is copied onto the row
 * so the history reads the same after the employee leaves.
 */
export async function logQuotationActivity(
  db: Db,
  args: {
    quotationId: string;
    admin: { id: string; name: string; email: string };
    action: QuotationActivityAction;
    detail?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.quotationActivity.create({
    data: {
      quotationId: args.quotationId,
      actorId: args.admin.id,
      actorName: args.admin.name || args.admin.email,
      action: args.action,
      detail: args.detail,
    },
  });
}
