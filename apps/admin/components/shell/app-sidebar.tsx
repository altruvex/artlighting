"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import { activeNavItem, NAV_GROUPS } from "@/constant";
import { can } from "@/lib/permissions";
import type { CurrentAdmin } from "@/lib/auth";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";

export function AppSidebar({ admin }: { admin: Pick<CurrentAdmin, "name" | "email" | "role"> }) {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const pathname = usePathname();
  const active = activeNavItem(pathname);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={tShell("brand")}>
              <Link href="/dashboard">
                {/* A neutral frame: the logo is already gold, and the sidebar's
                    gold belongs to the active item. */}
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sidebar-border bg-background">
                  <Image src="/logo-en.png" alt="" width={24} height={24} className="rounded-sm" />
                </span>
                <span className="grid leading-tight">
                  <span className="truncate text-sm font-semibold">{tShell("brand")}</span>
                  <span className="truncate text-xs text-muted-foreground">{tShell("admin")}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.permission || can(admin.role, item.permission));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{tShell(`groups.${group.key}`)}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => {
                  const isActive = active?.key === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.key)}>
                        <Link href={item.url} aria-current={isActive ? "page" : undefined}>
                          <item.icon />
                          <span>{t(item.key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu admin={admin} />
      </SidebarFooter>
    </Sidebar>
  );
}
