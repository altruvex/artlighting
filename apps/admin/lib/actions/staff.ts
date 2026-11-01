"use server";

import { type AdminRole, prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { auth as authInstance } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ActionError, run } from "./result";

/**
 * Creates a new admin/staff account. This is the only way an account gets
 * created now — /sign-up is gone, so only a manager (gated by
 * the staff:manage permission) can reach this. Internally still goes through Better Auth's
 * own signUpEmail so the password is hashed exactly the way it expects; the
 * public route it used to be reachable from is what's removed, not the
 * underlying signup logic.
 */
export async function createStaffAccount(data: {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}) {
  return run(async () => {
    await requirePermission("staff:manage");

    if (data.password.length < 12) {
      const t = await getTranslations("Team");
      throw new ActionError(t("errors.passwordTooShort"));
    }

    const existing = await prisma.admin.findUnique({ where: { email: data.email } });
    if (existing) {
      const t = await getTranslations("Team");
      throw new ActionError(t("errors.emailExists"));
    }

    await authInstance.api.signUpEmail({
      body: { email: data.email, password: data.password, name: data.name },
    });

    const admin = await prisma.admin.update({
      where: { email: data.email },
      data: { role: data.role },
    });

    revalidatePath("/dashboard/team");
    return admin;
  });
}

export async function updateAdminRole(adminId: string, role: AdminRole) {
  return run(async () => {
    const manager = await requirePermission("staff:manage");
    // The last way into team management is your own; handing it away is
    // done by making someone else a manager first.
    if (adminId === manager.id && role !== "MANAGER") {
      const t = await getTranslations("Team");
      throw new ActionError(t("errors.cantDemoteSelf"));
    }
    const admin = await prisma.admin.update({ where: { id: adminId }, data: { role } });
    revalidatePath("/dashboard/team");
    return admin;
  });
}

/**
 * Takes an employee's access away: their sign-in and every open session go,
 * so they cannot reach the admin again. Their row stays — quotations they
 * created and the activity they left keep their name — which is also why
 * this is not a delete: the database would refuse one while they have
 * quotations. Open quotations they own are handed on first, so no offer is
 * left with nobody answerable for it.
 */
export async function revokeAdminAccess(adminId: string) {
  return run(async () => {
    const manager = await requirePermission("staff:manage");
    const t = await getTranslations("Team");
    if (adminId === manager.id) throw new ActionError(t("errors.cantRevokeSelf"));

    const open = await prisma.quotation.count({ where: { ownerId: adminId, status: { in: ["DRAFT", "SENT"] } } });
    if (open > 0) throw new ActionError(t("errors.revokeHasQuotations", { count: open }));

    await prisma.$transaction([
      prisma.adminSession.deleteMany({ where: { adminId } }),
      prisma.adminAccount.deleteMany({ where: { adminId } }),
    ]);
    revalidatePath("/dashboard/team");
  });
}
