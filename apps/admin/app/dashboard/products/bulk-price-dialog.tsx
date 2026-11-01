"use client";

import { applyBulkPrice, previewBulkPrice } from "@/lib/actions/products";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { formatMoney } from "@/lib/money";
import { cn } from "@repo/ui/lib/utils";
import type { BulkPriceOperation, BulkPricePreviewRow } from "@repo/catalog";
import { ArrowRightIcon, TagIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProductRow } from "./products-table";

type Mode = BulkPriceOperation["mode"];

const MODES: Mode[] = ["set", "increase_percent", "decrease_percent", "increase_amount", "decrease_amount"];
const PERCENT_MODES: Mode[] = ["increase_percent", "decrease_percent"];

/**
 * Bulk price editing, opened from the products table's selection bar.
 *
 * Nothing is written until the admin has seen the diff: the preview is a
 * separate round trip, the apply button stays disabled until it has run, and
 * the apply recomputes server-side from the same function the preview used,
 * so a stale preview cannot cause an unseen write.
 */
export function BulkPriceDialog({ selected, clear }: { selected: ProductRow[]; clear: () => void }) {
  const t = useTranslations("Products.bulkPrice");
  const locale = useLocale();
  const router = useRouter();
  const fieldId = useId();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("increase_percent");
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<BulkPricePreviewRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPercent = PERCENT_MODES.includes(mode);
  const ids = selected.map((row) => row.id);

  function reset() {
    setPreview(null);
  }

  function buildOperation(): BulkPriceOperation | null {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (isPercent) {
      // The admin types a percent; the service takes a rate (0.13 = 13%).
      const asRate = Number(trimmed) / 100;
      if (!Number.isFinite(asRate)) return null;
      return { mode, rate: asRate.toFixed(4) } as BulkPriceOperation;
    }
    return { mode, amount: trimmed } as BulkPriceOperation;
  }

  function runPreview() {
    const operation = buildOperation();
    if (!operation) {
      toast.error(t("errors.valueRequired"));
      return;
    }
    startTransition(async () => {
      const result = await previewBulkPrice(ids, operation);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.missing.length > 0) {
        toast.error(t("errors.missing", { count: result.data.missing.length }));
        return;
      }
      setPreview(result.data.rows);
    });
  }

  function runApply() {
    const operation = buildOperation();
    if (!operation || !preview) return;
    startTransition(async () => {
      const result = await applyBulkPrice(ids, operation);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("applied", { count: result.data.updated }));
      setOpen(false);
      setPreview(null);
      setValue("");
      clear();
      router.refresh();
    });
  }

  const changedCount = preview?.filter((row) => row.changed).length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <TagIcon aria-hidden className="size-4" />
        {t("trigger", { count: selected.length })}
      </Button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { count: selected.length })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-mode`}>{t("modeLabel")}</Label>
            <Select
              value={mode}
              onValueChange={(next) => {
                setMode(next as Mode);
                reset();
              }}
            >
              <SelectTrigger id={`${fieldId}-mode`} className="w-full">
                <SelectValue>{t(`modes.${mode}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MODES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`modes.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-value`}>{isPercent ? t("percentLabel") : t("amountLabel")}</Label>
            <Input
              id={`${fieldId}-value`}
              inputMode="decimal"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                reset();
              }}
              placeholder={isPercent ? "10" : "100.00"}
              className="w-full sm:w-36 tabular-nums"
              dir="ltr"
            />
          </div>
        </div>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("previewSummary", { changed: changedCount, total: preview.length })}
            </p>
            {/* overflow-x-auto so a narrow viewport scrolls the table instead
                of the page (ui-ux-pro-max: Responsive / Table Handling). */}
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-xs text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]">
                  <tr>
                    <th scope="col" className="p-2 text-start font-medium">{t("columns.product")}</th>
                    <th scope="col" className="p-2 text-end font-medium">{t("columns.oldPrice")}</th>
                    <th scope="col" className="p-2 text-end font-medium">{t("columns.newPrice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.productId} className="border-t">
                      <td className="p-2">
                        <span className="block truncate font-medium">{row.productName}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">{row.sku}</span>
                      </td>
                      <td className="p-2 text-end tabular-nums text-muted-foreground">
                        <s>{formatMoney(row.oldPrice, { locale })}</s>
                      </td>
                      <td
                        className={cn(
                          "p-2 text-end tabular-nums font-medium",
                          row.changed ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {row.changed ? (
                          <span className="inline-flex items-center gap-1">
                            <ArrowRightIcon aria-hidden className="size-3 shrink-0 rtl:-scale-x-100" />
                            {formatMoney(row.newPrice, { locale })}
                          </span>
                        ) : (
                          t("unchanged")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={runPreview} disabled={isPending || value.trim() === ""}>
            {t("preview")}
          </Button>
          {/* Disabled until a preview exists: an irreversible bulk write is
              never one click away (ui-ux-pro-max: Confirmation Dialogs). */}
          <Button onClick={runApply} disabled={isPending || !preview || changedCount === 0}>
            {t("apply", { count: changedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
