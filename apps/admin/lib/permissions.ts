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
  /** Stock counts and adjustments — the warehouse's job, not the product editor's. */
  | "stock:write"
  | "order:read"
  | "order:write"
  | "customer:read"
  | "datasheet:generate"
  /** Open quotations. Without quotation:readAll, only the ones you own. */
  | "quotation:read"
  /** See every quotation, whoever owns it. */
  | "quotation:readAll"
  /** Create quotations, and edit, send and revise the ones you own. */
  | "quotation:write"
  /** Edit anyone's quotation and hand it to another owner. */
  | "quotation:manage"
  | "staff:manage"
  | "settings:write";

/** Every role, in the order the team page lists them. */
export const ADMIN_ROLES = ["MANAGER", "SALES", "ENGINEERING", "ACCOUNTS"] as const satisfies readonly AdminRole[];

/**
 * The four jobs in the company, each with what it needs and no more:
 *
 * - MANAGER: everything, including prices, discounts, the team, and any
 *   quotation.
 * - SALES: quotes and follows orders; sees only the quotations they own.
 *   Prices on a quotation line are the quotation's own, so quoting does not
 *   need price:write.
 * - ENGINEERING: the catalogue — products, specs, categories, datasheets —
 *   and reads every quotation to review it technically, without changing it.
 * - ACCOUNTS: orders, customers and stock; reads every quotation (to invoice
 *   what was accepted) without editing any.
 */
const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  MANAGER: [
    "catalog:read",
    "product:write",
    "price:write",
    "discount:write",
    "category:write",
    "stock:write",
    "order:read",
    "order:write",
    "customer:read",
    "datasheet:generate",
    "quotation:read",
    "quotation:readAll",
    "quotation:write",
    "quotation:manage",
    "staff:manage",
    "settings:write",
  ],
  SALES: [
    "catalog:read",
    "order:read",
    "order:write",
    "customer:read",
    "datasheet:generate",
    "quotation:read",
    "quotation:write",
  ],
  ENGINEERING: [
    "catalog:read",
    "product:write",
    "category:write",
    "datasheet:generate",
    "quotation:read",
    "quotation:readAll",
  ],
  ACCOUNTS: [
    "catalog:read",
    "stock:write",
    "order:read",
    "order:write",
    "customer:read",
    "quotation:read",
    "quotation:readAll",
  ],
};

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: AdminRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
