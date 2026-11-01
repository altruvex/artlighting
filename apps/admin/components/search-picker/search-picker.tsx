"use client";

import { useDebouncedQuery } from "@/components/data-table";
import type { ActionResult } from "@/lib/actions/result";
import { Command, CommandEmpty, CommandInput, CommandList } from "@repo/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * A combobox that asks the server as the admin types, instead of filtering a
 * list the page loaded in full. Opened empty it shows the first page (what
 * the old in-memory pickers listed first); typing searches after a 300 ms
 * pause, and an answer that arrives after a newer question is dropped.
 *
 * The caller renders the rows (`children`), so one product can still be
 * offered as several picks (its variants).
 */
export function SearchPicker<T>({
  trigger,
  search,
  children,
  placeholder,
  emptyText,
  minChars = 2,
  align = "start",
  contentClassName,
  listClassName,
}: {
  /** The button that opens it; rendered with PopoverTrigger asChild. */
  trigger: ReactNode;
  /** A server action from lib/actions/search.ts. */
  search: (q: string) => Promise<ActionResult<T[]>>;
  children: (results: T[], helpers: { close: () => void }) => ReactNode;
  placeholder?: string;
  emptyText?: string;
  /** Shorter queries wait for more typing; an empty one lists the first page. */
  minChars?: number;
  align?: "start" | "center" | "end";
  contentClassName?: string;
  listClassName?: string;
}) {
  const t = useTranslations("SearchPicker");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  async function load(q: string) {
    const id = ++latest.current;
    setLoading(true);
    const result = await search(q.trim());
    // A slower answer to an older query must not replace a newer one.
    if (id !== latest.current) return;
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      setResults([]);
      return;
    }
    setResults(result.data);
  }

  const [input, setInput] = useDebouncedQuery("", (value) => {
    if (value.trim().length >= minChars) void load(value);
  });
  const tooShort = input.trim().length > 0 && input.trim().length < minChars;

  // Start fresh next time. An answer still in flight is dropped by the next
  // open, whose load() takes a newer id.
  function close() {
    setOpen(false);
    setInput("");
    setResults([]);
    setLoading(false);
  }

  function onOpenChange(next: boolean) {
    if (next) {
      setOpen(true);
      void load("");
    } else {
      close();
    }
  }

  function onInput(value: string) {
    setInput(value);
    // Back to empty: the first page again, without waiting for the debounce
    // (which does not fire for the initial value).
    if (value.trim() === "") void load("");
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("p-0", contentClassName)} align={align}>
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder ?? t("search")} value={input} onValueChange={onInput} />
          <CommandList className={listClassName} aria-busy={loading}>
            {tooShort ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("minChars", { count: minChars })}</p>
            ) : (
              <>
                <CommandEmpty>{loading ? t("loading") : (emptyText ?? t("empty"))}</CommandEmpty>
                <div className={cn("transition-opacity", loading && results.length > 0 && "opacity-60")}>
                  {children(results, { close })}
                </div>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
