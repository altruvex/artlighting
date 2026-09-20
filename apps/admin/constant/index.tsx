import {
  BellIcon,
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
  /** Only shown to admins (the page itself also enforces it). */
  adminOnly?: boolean;
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
    items: [{ key: "dashboard", url: "/admin/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    key: "sales",
    items: [
      { key: "orders", url: "/admin/dashboard/orders", icon: ShoppingCartIcon },
      { key: "customers", url: "/admin/dashboard/users", icon: UsersIcon },
      { key: "discounts", url: "/admin/dashboard/discounts", icon: PercentIcon },
    ],
  },
  {
    key: "catalog",
    items: [
      { key: "products", url: "/admin/dashboard/products", icon: PackageIcon },
      { key: "inventory", url: "/admin/dashboard/inventory", icon: WarehouseIcon },
      { key: "bulbs", url: "/admin/dashboard/bulbs", icon: LightbulbIcon },
      { key: "categories", url: "/admin/dashboard/categories", icon: FolderTreeIcon },
    ],
  },
  {
    key: "system",
    items: [
      { key: "team", url: "/admin/dashboard/team", icon: ShieldIcon, adminOnly: true },
      { key: "notifications", url: "/admin/dashboard/notification", icon: BellIcon },
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
