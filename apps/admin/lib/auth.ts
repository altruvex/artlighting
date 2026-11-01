import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AdminRole } from "@repo/database";
import { can, type Permission } from "./permissions";
import { auth as authInstance } from "./auth-server";

export interface CurrentAdmin {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: AdminRole;
}

/**
 * Resolves the current Better Auth admin session. The session's user IS the
 * Admin row (see apps/admin/lib/auth-server.ts — `user.modelName: "admin"`),
 * so there's no separate DB lookup needed once the session resolves — this
 * is the single source of truth for "is this user an admin", replacing the
 * old per-route `email === process.env.ADMIN_EMAIL` comparisons.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  // cache(): the layout and the page (and every requirePermission in one
  // request) share one session lookup instead of a DB query each.
  const session = await authInstance.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = session.user as unknown as CurrentAdmin;
  return user;
});

/** Resolves the current Admin, throwing if there's no session at all. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new AdminAuthError("unauthenticated", await authErrorMessage("unauthenticated"));
  }
  return admin;
}

/**
 * Resolves the current Admin and checks one capability (see
 * lib/permissions.ts). Server actions and route handlers call this: a role
 * comparison spread across call sites is how a new action ends up
 * unprotected.
 */
export async function requirePermission(permission: Permission): Promise<CurrentAdmin> {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) {
    throw new AdminAuthError("forbidden", await authErrorMessage("forbidden"));
  }
  return admin;
}

type AdminAuthReason = "unauthenticated" | "not_admin" | "forbidden";

const AUTH_ERROR_KEYS = {
  unauthenticated: "errors.unauthenticated",
  not_admin: "errors.notAdmin",
  forbidden: "errors.forbidden",
} as const;

/** Localized, user-facing text for an auth failure (the reason code stays the stable identifier). */
async function authErrorMessage(reason: AdminAuthReason): Promise<string> {
  const t = await getTranslations("Auth");
  return t(AUTH_ERROR_KEYS[reason]);
}

export class AdminAuthError extends Error {
  constructor(
    public reason: AdminAuthReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "AdminAuthError";
  }
}

/** Convenience wrapper for server-component pages: resolves an Admin or redirects. */
export async function requireAdminOrRedirect(): Promise<CurrentAdmin> {
  try {
    return await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      redirect(err.reason === "unauthenticated" ? "/sign-in" : "/404");
    }
    throw err;
  }
}

/** Same as above, but requires the owner role. */
export async function requirePermissionOrRedirect(permission: Permission): Promise<CurrentAdmin> {
  try {
    return await requirePermission(permission);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      redirect(err.reason === "unauthenticated" ? "/sign-in" : "/404");
    }
    throw err;
  }
}
