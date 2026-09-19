import { BellDot, Boxes, FolderTree, HomeIcon, PackageIcon, PercentIcon, ShieldIcon, UsersIcon } from "lucide-react";

// `key` is the Nav.* message key (messages/{en,ar}.json).
export const DASHBOARDS = [
    {
        key: "dashboard",
        icon: <HomeIcon className="h-5 w-5" />,
        url: "/admin/dashboard",
    },
    {
        key: "orders",
        icon: <Boxes className="h-5 w-5" />,
        url: "/admin/dashboard/orders",
    },
    {
        key: "products",
        icon: <PackageIcon className="h-5 w-5" />,
        url: "/admin/dashboard/products",
    },
    {
        key: "categories",
        icon: <FolderTree className="h-5 w-5" />,
        url: "/admin/dashboard/categories",
    },
    {
        key: "discounts",
        icon: <PercentIcon className="h-5 w-5" />,
        url: "/admin/dashboard/discounts",
    },
    {
        key: "customers",
        icon: <UsersIcon className="h-5 w-5" />,
        url: "/admin/dashboard/users",
    },
    {
        key: "team",
        icon: <ShieldIcon className="h-5 w-5" />,
        url: "/admin/dashboard/team",
    },
    {
        key: "notifications",
        icon: <BellDot className="h-5 w-5" />,
        url: "/admin/dashboard/notification",
    },
] as const;
