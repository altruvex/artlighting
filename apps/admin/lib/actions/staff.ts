"use server";

import { type AdminRole, prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { auth as authInstance } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ActionError, run } from "./result";

/**
 * Creates a new admin/staff account. This is the only way an account gets
 * created now — /sign-up is gone, so only an existing owner (gated by
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

    revalidatePath("/admin/dashboard/team");
    return admin;
  });
}

export async function updateAdminRole(adminId: string, role: AdminRole) {
  return run(async () => {
    const owner = await requirePermission("staff:manage");
    if (adminId === owner.id && role === "STAFF") {
      const t = await getTranslations("Team");
      throw new ActionError(t("errors.cantDemoteSelf"));
    }
    const admin = await prisma.admin.update({ where: { id: adminId }, data: { role } });
    revalidatePath("/admin/dashboard/team");
    return admin;
  });
}

export async function revokeAdminAccess(adminId: string) {
  return run(async () => {
    const owner = await requirePermission("staff:manage");
    if (adminId === owner.id) {
      const t = await getTranslations("Team");
      throw new ActionError(t("errors.cantRevokeSelf"));
    }
    await prisma.admin.delete({ where: { id: adminId } });
    revalidatePath("/admin/dashboard/team");
  });
}
