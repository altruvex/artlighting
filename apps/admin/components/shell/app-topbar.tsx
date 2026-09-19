"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandMenu } from "./command-menu";

export function AppTopbar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="me-1 data-[orientation=vertical]:h-4" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <CommandMenu isAdmin={isAdmin} />
    </header>
  );
}
