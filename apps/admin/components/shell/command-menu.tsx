"use client";

import type { Permission } from "@/lib/permissions";
import { Button } from "@repo/ui/components/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import { NAV_GROUPS } from "@/constant";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** ⌘K / Ctrl+K palette: jump to any module or start a common action. */
export function CommandMenu({ permissions }: { permissions: readonly Permission[] }) {
  const allowed = (permission?: Permission) => !permission || permissions.includes(permission);
  const t = useTranslations("Shell.command");
  const tNav = useTranslations("Nav");
  const tGroups = useTranslations("Shell.groups");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-9 justify-start gap-2 px-2 text-muted-foreground sm:w-56 sm:px-3"
        aria-label={t("open")}
      >
        <SearchIcon className="size-4" />
        <span className="hidden truncate sm:inline">{t("placeholder")}</span>
        <kbd className="pointer-events-none ms-auto hidden select-none rounded-sm border bg-muted px-1.5 font-mono text-2xs font-medium sm:inline" dir="ltr">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} description={t("description")}>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          <CommandGroup heading={t("actions")}>
            {allowed("product:write") && (
              <CommandItem onSelect={() => go("/dashboard/products/new")}>
                <PlusIcon />
                {t("newProduct")}
              </CommandItem>
            )}
            {allowed("quotation:write") && (
              <CommandItem onSelect={() => go("/dashboard/quotations/new")}>
                <PlusIcon />
                {t("newQuotation")}
              </CommandItem>
            )}
          </CommandGroup>
          {NAV_GROUPS.map((group) => (
            <CommandGroup key={group.key} heading={tGroups(group.key)}>
              {group.items
                .filter((item) => allowed(item.permission))
                .map((item) => (
                  <CommandItem key={item.key} onSelect={() => go(item.url)}>
                    <item.icon />
                    {tNav(item.key)}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
