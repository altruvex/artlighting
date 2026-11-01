"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import type { Column } from "@tanstack/react-table";
import type { AdminTableFeatures } from "./features";
import { CheckIcon, PlusCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface FacetOption {
  value: string;
  label: string;
}

/** Column-bound wrapper (client-side tables). */
export function FacetedFilter<TData extends Record<string, unknown>, TValue>({
  column,
  title,
  options,
}: {
  column?: Column<AdminTableFeatures, TData, TValue>;
  title: string;
  options: FacetOption[];
}) {
  return (
    <FacetFilterMenu
      title={title}
      options={options}
      selected={(column?.getFilterValue() as string[]) ?? []}
      onChange={(values) => column?.setFilterValue(values.length ? values : undefined)}
    />
  );
}

/** Multi-select filter menu (status, category, brand…). */
export function FacetFilterMenu({
  title,
  options,
  selected: selectedValues,
  onChange,
  disabled,
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("DataTable");
  const selected = new Set(selectedValues);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed" disabled={disabled}>
          <PlusCircleIcon className="size-3.5" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal tabular-nums">
                {selected.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>{t("noOptions")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(option.value);
                      else next.add(option.value);
                      onChange([...next]);
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center">
                    {t("clearFilter")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
