import type { Permission } from "@/lib/permissions";
import {
  BellIcon,
  FileTextIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  type LucideIcon,
  PackageIcon,
  WarehouseIcon,
  PercentIcon,
  ShieldIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "lucide-react";

export type NavKey =
  | "dashboard"
  | "orders"
  | "quotations"
  | "customers"
  | "discounts"
  | "inventory"
  | "bulbs"
  | "products"
  | "categories"
  | "team"
  | "notifications";

export interface NavItem {
  /** Nav.* message key. */
  key: NavKey;
  url: string;
  icon: LucideIcon;
  /** Shown only to roles with this permission (the page itself also enforces it). */
  permission?: Permission;
}

export interface NavGroup {
  /** Shell.groups.* message key. */
  key: "overview" | "sales" | "catalog" | "system";
  items: NavItem[];
}

/**
 * Sidebar structure, grouped by ERP module. New modules (quotations,
 * invoices, settings…) slot into their group here.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    items: [{ key: "dashboard", url: "/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    key: "sales",
    items: [
      { key: "orders", url: "/dashboard/orders", icon: ShoppingCartIcon, permission: "order:read" },
      { key: "quotations", url: "/dashboard/quotations", icon: FileTextIcon, permission: "quotation:read" },
      { key: "customers", url: "/dashboard/users", icon: UsersIcon, permission: "customer:read" },
      { key: "discounts", url: "/dashboard/discounts", icon: PercentIcon, permission: "catalog:read" },
    ],
  },
  {
    key: "catalog",
    items: [
      { key: "products", url: "/dashboard/products", icon: PackageIcon, permission: "catalog:read" },
      { key: "inventory", url: "/dashboard/inventory", icon: WarehouseIcon, permission: "catalog:read" },
      { key: "bulbs", url: "/dashboard/bulbs", icon: LightbulbIcon, permission: "catalog:read" },
      { key: "categories", url: "/dashboard/categories", icon: FolderTreeIcon, permission: "catalog:read" },
    ],
  },
  {
    key: "system",
    items: [
      { key: "team", url: "/dashboard/team", icon: ShieldIcon, permission: "staff:manage" },
      { key: "notifications", url: "/dashboard/notification", icon: BellIcon },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The nav item a pathname belongs to (longest matching prefix). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.url.length - a.url.length)
    .find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`));
}
