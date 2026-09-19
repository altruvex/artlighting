"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import type { CurrentAdmin } from "@/lib/auth";
import { ChevronsUpDownIcon, LanguagesIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const LANGUAGE_LABELS: Record<Locale, string> = { en: "English", ar: "العربية" };

function initials(name: string, email: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  // Two initials from two words ("Ali Hassan" -> AH), otherwise the first
  // two letters of the single word, so the avatar is never one lonely glyph.
  const fromName = parts.length > 1 ? parts.map((part) => part[0]).join("").slice(0, 2) : parts[0]?.slice(0, 2);
  return (fromName || email.slice(0, 2)).toUpperCase();
}

export function UserMenu({ admin }: { admin: Pick<CurrentAdmin, "name" | "email" | "role"> }) {
  const t = useTranslations("Shell.userMenu");
  const tRoles = useTranslations("Team.roles");
  const locale = useLocale();
  const router = useRouter();
  const { theme = "system", setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  function changeLocale(next: string) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              tooltip={admin.name || admin.email}
              disabled={isPending}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold"
              >
                {initials(admin.name, admin.email)}
              </span>
              <span className="grid min-w-0 flex-1 text-start leading-tight">
                <span className="truncate text-sm font-medium">{admin.name || admin.email}</span>
                <span className="truncate text-xs text-muted-foreground">{tRoles(admin.role)}</span>
              </span>
              <ChevronsUpDownIcon className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="grid leading-tight">
                <span className="truncate text-sm font-medium">{admin.name || admin.email}</span>
                <span className="truncate text-xs text-muted-foreground" dir="ltr">
                  {admin.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LanguagesIcon />
                {t("language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
                  {locales.map((l) => (
                    <DropdownMenuRadioItem key={l} value={l} lang={l}>
                      {LANGUAGE_LABELS[l]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === "dark" ? <MoonIcon /> : theme === "light" ? <SunIcon /> : <MonitorIcon />}
                {t("theme")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">{t("themeLight")}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">{t("themeDark")}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">{t("themeSystem")}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOutIcon className="rtl:-scale-x-100" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
