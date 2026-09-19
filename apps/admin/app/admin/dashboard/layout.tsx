import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

/**
 * ERP shell for every /admin/dashboard page: grouped sidebar (icon rail when
 * collapsed, drawer on mobile), sticky top bar with breadcrumbs and the ⌘K
 * palette, and the page in <main id="content">.
 *
 * The session check here covers the whole section; pages and server actions
 * still authorize themselves (a layout doesn't re-run on client navigation
 * and never protects server actions).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminOrRedirect();
  const sidebarState = (await cookies()).get("sidebar_state")?.value;

  return (
    <SidebarProvider defaultOpen={sidebarState !== "false"}>
      <AppSidebar admin={{ name: admin.name, email: admin.email, role: admin.role }} />
      <SidebarInset>
        <AppTopbar isAdmin={can(admin.role, "staff:manage")} />
        <main id="content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
