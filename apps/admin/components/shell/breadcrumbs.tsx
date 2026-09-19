"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { activeNavItem } from "@/constant";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

/**
 * Derived from the URL: Dashboard › <module> › <new | details>. Record ids
 * aren't shown raw (cuids are meaningless to staff); pages put the record's
 * name in their own header instead.
 */
export function Breadcrumbs() {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell.breadcrumbs");
  const pathname = usePathname();
  const section = activeNavItem(pathname);

  const crumbs: { label: string; href?: string }[] = [{ label: t("dashboard"), href: "/admin/dashboard" }];
  if (section && section.key !== "dashboard") {
    crumbs.push({ label: t(section.key), href: section.url });
    const rest = pathname.slice(section.url.length).split("/").filter(Boolean);
    if (rest.length > 0) crumbs.push({ label: rest[0] === "new" ? tShell("new") : tShell("details") });
  }
  const last = crumbs.length - 1;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <BreadcrumbSeparator className={i < last ? "hidden md:block" : undefined}>
                <ChevronRightIcon className="rtl:-scale-x-100" />
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem className={i < last ? "hidden md:inline-flex" : undefined}>
              {i === last || !crumb.href ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
