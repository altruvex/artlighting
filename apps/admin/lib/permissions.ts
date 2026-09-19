import type { AdminRole } from "@repo/database";

/**
 * What an admin is allowed to do. Every server action and route handler
 * authorizes against one of these, so adding a capability is a change in one
 * table rather than a scattered `role === "..."` check.
 */
export type Permission =
  | "catalog:read"
  | "product:write"
  | "price:write"
  | "discount:write"
  | "category:write"
  | "order:read"
  | "order:write"
  | "customer:read"
  | "datasheet:generate"
  | "staff:manage"
  | "settings:write";

const STAFF_PERMISSIONS: Permission[] = [
  "catalog:read",
  "product:write",
  "category:write",
  "order:read",
  "order:write",
  "customer:read",
  "datasheet:generate",
];

/** ADMIN is STAFF plus the commercial and account-management powers. */
const ADMIN_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  "price:write",
  "discount:write",
  "staff:manage",
  "settings:write",
];

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  STAFF: STAFF_PERMISSIONS,
};

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: AdminRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
