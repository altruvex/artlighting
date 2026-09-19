"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Column } from "@tanstack/react-table";
import type { AdminTableFeatures } from "./features";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** Sortable column header; plain text when the column isn't sortable. */
export function ColumnHeader<TData extends Record<string, unknown>, TValue>({
  column,
  title,
  className,
}: {
  column: Column<AdminTableFeatures, TData, TValue>;
  title: ReactNode;
  className?: string;
}) {
  const t = useTranslations("DataTable");
  if (!column.getCanSort()) return <span className={className}>{title}</span>;

  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn("-ms-2 h-7 gap-1 px-2 data-[state=open]:bg-accent", className)}
      aria-label={t("sortBy", { column: typeof title === "string" ? title : "" })}
    >
      <span>{title}</span>
      <Icon className={cn("size-3.5", sorted ? "text-foreground" : "text-muted-foreground")} />
    </Button>
  );
}
