"use client";

import { applyProductsSheet, previewProductsSheet } from "@/lib/actions/catalog-sheet";
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
import { cn } from "@repo/ui/lib/utils";
import type { ImportAction, ImportPlan } from "@repo/catalog";
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * The Excel round trip: export, edit in Excel, preview, apply.
 *
 * The preview is the whole point — it writes nothing and reports every row,
 * so the admin can see a three-decimal price or a SKU that does not exist
 * before any of it reaches the catalogue. Errors sit on their own row with
 * the sheet's own row number, rather than piling into one message at the top
 * (ui-ux-pro-max: Forms / Error Placement).
 */

/** Status tones from the repo's token set — no new colours. */
const ACTION_TONE: Record<ImportAction, string> = {
  update: "text-success",
  create: "text-info",
  unchanged: "text-muted-foreground",
  error: "text-danger",
};

/** The file comes from a route that streams it; the name is the server's. */
function filenameFrom(response: Response) {
  const header = response.headers.get("Content-Disposition") ?? "";
  return /filename="([^"]+)"/.exec(header)?.[1] ?? "artlighting-products.xlsx";
}

export function CatalogSheetActions({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("Products.sheet");
  const tCommon = useTranslations("Common");
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [isPending, startTransition] = useTransition();

  function runExport() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/products/export", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          toast.error(body?.error ?? tCommon("genericError"));
          return;
        }
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filenameFrom(response);
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(t("exported", { count: Number(response.headers.get("X-Row-Count")) || 0 }));
      } catch {
        toast.error(tCommon("genericError"));
      }
    });
  }

  function runPreview(next: File) {
    setFile(next);
    setPlan(null);
    const formData = new FormData();
    formData.set("file", next);
    startTransition(async () => {
      const result = await previewProductsSheet(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPlan(result.data);
    });
  }

  function runApply() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await applyProductsSheet(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("applied", { count: result.data.updated }));
      setOpen(false);
      setFile(null);
      // applyProductsSheet revalidates this route; no refresh needed.
      setPlan(null);
    });
  }

  const updateCount = plan?.counts.update ?? 0;

  return (
    <>
      <Button size="sm" variant="outline" onClick={runExport} disabled={isPending}>
        <DownloadIcon aria-hidden className="size-4" />
        {t("export")}
      </Button>

      {canWrite && (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setFile(null);
              setPlan(null);
            }
          }}
        >
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <UploadIcon aria-hidden className="size-4" />
            {t("import")}
          </Button>

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("importTitle")}</DialogTitle>
              <DialogDescription>{t("importDescription")}</DialogDescription>
            </DialogHeader>

            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) runPreview(next);
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isPending}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center transition-colors",
                  "duration-(--dur-hover) ease-(--ease-out) hover:border-foreground/30 hover:bg-muted/40",
                  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isPending && "opacity-60"
                )}
              >
                <FileSpreadsheetIcon aria-hidden className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : t("choose")}</span>
                <span className="text-xs text-muted-foreground">{t("chooseHint")}</span>
              </button>
            </div>

            {plan && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {(["update", "unchanged", "error"] as const).map((action) => (
                    <span key={action} className={ACTION_TONE[action]}>
                      {t(`counts.${action}`, { count: plan.counts[action] })}
                    </span>
                  ))}
                </div>

                {/* Scrolls inside its own box, so a 500-row sheet does not turn
                    the dialog into a page (ui-ux-pro-max: Table Handling). */}
                <div className="max-h-80 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card text-xs text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]">
                      <tr>
                        <th scope="col" className="p-2 text-start font-medium">{t("columns.row")}</th>
                        <th scope="col" className="p-2 text-start font-medium">{t("columns.sku")}</th>
                        <th scope="col" className="p-2 text-start font-medium">{t("columns.change")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.rows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.sku ?? "none"}`} className="border-t align-top">
                          <td className="p-2 tabular-nums text-muted-foreground" dir="ltr">{row.rowNumber}</td>
                          <td className="p-2 font-medium" dir="ltr">{row.sku ?? "—"}</td>
                          <td className={cn("p-2", ACTION_TONE[row.action])}>
                            {row.errors.length > 0 ? (
                              <ul className="space-y-0.5">
                                {row.errors.map((error) => (
                                  <li key={error}>{error}</li>
                                ))}
                              </ul>
                            ) : row.action === "unchanged" ? (
                              t("noChange")
                            ) : (
                              <ul className="space-y-0.5">
                                {Object.entries(row.changes).map(([field, [before, after]]) => (
                                  <li key={field} className="flex flex-wrap items-baseline gap-1">
                                    <span className="text-muted-foreground">{field}</span>
                                    <s className="text-muted-foreground" dir="ltr">{before || "—"}</s>
                                    <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                                    <span className="font-medium" dir="ltr">{after || "—"}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">{t("neverDeletes")}</p>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" disabled={isPending}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              {/* No preview, nothing to apply — the sheet is never written on
                  one click (ui-ux-pro-max: Confirmation Dialogs). */}
              <Button onClick={runApply} disabled={isPending || !plan || updateCount === 0}>
                {t("apply", { count: updateCount })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
