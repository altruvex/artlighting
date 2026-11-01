"use client";

import { saveDatasheetToProduct } from "@/lib/actions/datasheet";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import {
  changesToPayload,
  diffDraft,
  type DraftChange,
} from "@/lib/datasheet/draft-schema";
import { cn } from "@repo/ui/lib/utils";
import type { ImageRef } from "@repo/datasheet/preview";
import { recordDatasheetPage } from "@repo/datasheet/preview";
import { mapDraft, type DatasheetDraft, type DraftImageOption, type DraftRow } from "@repo/datasheet-data/core";
import {
  AlertTriangleIcon, ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, DownloadIcon, PlusIcon,
  RotateCcwIcon, StarIcon, Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatasheetPreview } from "./datasheet-preview";

let seed = 0;
const newId = () => `new-${Date.now().toString(36)}-${++seed}`;

export function DatasheetStudio({
  initialDraft,
  imageOptions,
  canSaveToProduct,
}: {
  initialDraft: DatasheetDraft;
  imageOptions: DraftImageOption[];
  canSaveToProduct: boolean;
}) {
  const t = useTranslations("DatasheetStudio");
  const fieldId = useId();
  const [draft, setDraft] = useState<DatasheetDraft>(initialDraft);
  const [exportOpen, setExportOpen] = useState(false);

  // Natural sizes for pictures the database has no dimensions for, measured
  // in the browser so the preview keeps their proportions like the file does.
  const [measured, setMeasured] = useState<Record<string, { w: number; h: number }>>({});
  useEffect(() => {
    for (const option of imageOptions) {
      if (option.width && option.height) continue;
      const img = new Image();
      img.onload = () => setMeasured((m) => ({ ...m, [option.id]: { w: img.naturalWidth, h: img.naturalHeight } }));
      img.src = option.url;
    }
  }, [imageOptions]);

  const imageRefs = useMemo(() => {
    const map = new Map<string, ImageRef>();
    for (const o of imageOptions) {
      const w = o.width ?? measured[o.id]?.w;
      const h = o.height ?? measured[o.id]?.h;
      map.set(o.id, { kind: "path", path: o.url, width: w, height: h });
    }
    return map;
  }, [imageOptions, measured]);

  const recording = useMemo(() => recordDatasheetPage(mapDraft(draft, (id) => imageRefs.get(id))), [draft, imageRefs]);
  const changes = useMemo(() => diffDraft(draft), [draft]);
  const fits = !recording.report.specsOverflow && !recording.report.descriptionTooLong;
  const edited = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  const patch = (next: Partial<DatasheetDraft>) => setDraft((d) => ({ ...d, ...next }));
  const patchSection = (sectionId: string, fn: (s: DatasheetDraft["sections"][number]) => DatasheetDraft["sections"][number]) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === sectionId ? fn(s) : s)) }));
  const patchRow = (sectionId: string, rowId: string, next: Partial<DraftRow>) =>
    patchSection(sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...next } : r)) }));
  const move = <T,>(list: T[], index: number, delta: number): T[] => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  };

  return (
    <PageShell className="max-w-[1500px]">
      <PageHeader
        title={t("title", { code: initialDraft.productCode })}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href={`/dashboard/products/${draft.productId}`}>
                <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
                {t("back")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={!edited} onClick={() => setDraft(initialDraft)}>
              <RotateCcwIcon aria-hidden className="size-4" />
              {t("reset")}
            </Button>
            <Button asChild variant="outline" size="sm" className="lg:hidden">
              <a href="#datasheet-preview">{t("jumpToPreview")}</a>
            </Button>
            <Button size="sm" disabled={!fits} onClick={() => setExportOpen(true)} title={fits ? undefined : t("fixLayoutFirst")}>
              <DownloadIcon aria-hidden className="size-4" />
              {t("export")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="min-w-0 space-y-4">
          <Section title={t("sections.heading")}>
            <div className="space-y-3">
              <Field id={`${fieldId}-code`} label={t("fields.code")}>
                <Input id={`${fieldId}-code`} dir="ltr" value={draft.productCode} maxLength={40} onChange={(e) => patch({ productCode: e.target.value })} />
              </Field>
              <Field id={`${fieldId}-category`} label={t("fields.category")}>
                <Input id={`${fieldId}-category`} dir="ltr" value={draft.categoryLabel} maxLength={80} onChange={(e) => patch({ categoryLabel: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section
            title={t("sections.description")}
            action={
              draft.description !== draft.originalDescription && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patch({ description: draft.originalDescription })}>
                  <RotateCcwIcon aria-hidden className="size-3.5" />
                  {t("undo")}
                </Button>
              )
            }
          >
            <Textarea
              dir="ltr"
              rows={5}
              maxLength={1200}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              aria-label={t("sections.description")}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {draft.descriptionIsAuthored ? t("descriptionAuthored") : t("descriptionGenerated")}
            </p>
          </Section>

          {draft.sections.map((section, sIndex) => (
            <Section
              key={section.id}
              title={
                <Input
                  dir="ltr"
                  value={section.title}
                  maxLength={40}
                  onChange={(e) => patchSection(section.id, (s) => ({ ...s, title: e.target.value }))}
                  aria-label={t("sectionTitle")}
                  className="h-8 border-transparent bg-transparent px-1 font-semibold shadow-none hover:border-input focus-visible:border-input"
                />
              }
              action={
                <div className="flex items-center">
                  <IconButton label={t("moveSectionUp")} disabled={sIndex === 0} onClick={() => patch({ sections: move(draft.sections, sIndex, -1) })}>
                    <ChevronUpIcon className="size-4" />
                  </IconButton>
                  <IconButton label={t("moveSectionDown")} disabled={sIndex === draft.sections.length - 1} onClick={() => patch({ sections: move(draft.sections, sIndex, 1) })}>
                    <ChevronDownIcon className="size-4" />
                  </IconButton>
                  <IconButton label={t("removeSection")} danger onClick={() => patch({ sections: draft.sections.filter((s) => s.id !== section.id) })}>
                    <Trash2Icon className="size-4" />
                  </IconButton>
                </div>
              }
              flush
            >
              <ul className="divide-y">
                {section.rows.map((row, rIndex) => (
                  <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-1.5 px-3 py-2">
                    <Input
                      dir="ltr"
                      value={row.label}
                      maxLength={80}
                      onChange={(e) => patchRow(section.id, row.id, { label: e.target.value })}
                      aria-label={t("rowLabel")}
                      className="h-8 text-sm"
                    />
                    <Input
                      dir="ltr"
                      value={row.value}
                      maxLength={160}
                      onChange={(e) => patchRow(section.id, row.id, { value: e.target.value })}
                      aria-label={t("rowValue", { label: row.label || "—" })}
                      className={cn("h-8 text-sm", row.highlight && "font-semibold text-primary")}
                    />
                    <div className="flex items-center">
                      <IconButton
                        label={t("highlight")}
                        pressed={row.highlight}
                        onClick={() => patchRow(section.id, row.id, { highlight: !row.highlight })}
                      >
                        <StarIcon className={cn("size-4", row.highlight && "fill-current text-primary")} />
                      </IconButton>
                      <IconButton label={t("moveUp")} disabled={rIndex === 0} onClick={() => patchSection(section.id, (s) => ({ ...s, rows: move(s.rows, rIndex, -1) }))}>
                        <ChevronUpIcon className="size-4" />
                      </IconButton>
                      <IconButton label={t("moveDown")} disabled={rIndex === section.rows.length - 1} onClick={() => patchSection(section.id, (s) => ({ ...s, rows: move(s.rows, rIndex, 1) }))}>
                        <ChevronDownIcon className="size-4" />
                      </IconButton>
                      <IconButton label={t("removeRow")} danger onClick={() => patchSection(section.id, (s) => ({ ...s, rows: s.rows.filter((r) => r.id !== row.id) }))}>
                        <Trash2Icon className="size-4" />
                      </IconButton>
                    </div>
                    <p className="col-span-3 -mt-0.5 text-2xs text-muted-foreground">
                      {row.source.kind === "spec"
                        ? row.original && (row.original.value !== row.value.trim() || row.original.label !== row.label.trim())
                          ? t("source.editedSpec", { value: row.original.value })
                          : t("source.spec")
                        : row.source.kind === "derived"
                          ? t("source.derived")
                          : t("source.new")}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="border-t bg-muted/30 px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patchSection(section.id, (s) => ({
                      ...s,
                      rows: [...s.rows, { id: newId(), label: "", value: "", highlight: false, source: { kind: "new" } }],
                    }))
                  }
                >
                  <PlusIcon aria-hidden className="size-4" />
                  {t("addRow")}
                </Button>
              </div>
            </Section>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed"
            disabled={draft.sections.length >= 10}
            onClick={() =>
              patch({
                sections: [
                  ...draft.sections,
                  { id: newId(), title: t("newSectionTitle"), target: "custom", rows: [{ id: newId(), label: "", value: "", highlight: false, source: { kind: "new" } }] },
                ],
              })
            }
          >
            <PlusIcon aria-hidden className="size-4" />
            {t("addSection")}
          </Button>

          <Section title={t("sections.pictures")} description={t("sections.picturesDescription")}>
            <div className="space-y-4">
              <PicturePicker
                label={t("pictures.photo")}
                options={imageOptions}
                selected={draft.images.photoId ? [draft.images.photoId] : []}
                onToggle={(id) => patch({ images: { ...draft.images, photoId: draft.images.photoId === id ? null : id } })}
              />
              <PicturePicker
                label={t("pictures.drawings")}
                hint={t("pictures.drawingsHint")}
                options={imageOptions}
                selected={draft.images.drawingIds}
                onToggle={(id) => {
                  const has = draft.images.drawingIds.includes(id);
                  if (!has && draft.images.drawingIds.length >= 4) {
                    toast.error(t("pictures.drawingsMax"));
                    return;
                  }
                  patch({
                    images: {
                      ...draft.images,
                      drawingIds: has ? draft.images.drawingIds.filter((d) => d !== id) : [...draft.images.drawingIds, id],
                    },
                  });
                }}
              />
              <PicturePicker
                label={t("pictures.application")}
                options={imageOptions}
                selected={draft.images.applicationId ? [draft.images.applicationId] : []}
                onToggle={(id) => patch({ images: { ...draft.images, applicationId: draft.images.applicationId === id ? null : id } })}
              />
              {draft.brand && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={draft.showBrandLogo} onCheckedChange={(v) => patch({ showBrandLogo: Boolean(v) })} />
                  {t("pictures.brandLogo", { brand: draft.brand })}
                </label>
              )}
            </div>
          </Section>
        </div>

        {/* Live preview */}
        {/* top-20 clears the sticky 3.5rem top bar; at top-4 the bar covered
            the head of the page being previewed. */}
        <div id="datasheet-preview" className="min-w-0 scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{t("preview")}</span>
            {changes.length > 0 && <StatusBadge tone="info">{t("changesCount", { count: changes.length })}</StatusBadge>}
          </div>
          {!fits && (
            <div role="alert" className="mb-3 flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                {recording.report.specsOverflow && <p>{t("layout.specsOverflow")}</p>}
                {recording.report.descriptionTooLong && <p>{t("layout.descriptionTooLong")}</p>}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-[760px]">
            <DatasheetPreview recording={recording} label={t("previewLabel", { code: draft.productCode })} />
          </div>
        </div>
      </div>

      <ExportDialog
        key={exportOpen ? "open" : "closed"}
        open={exportOpen}
        onOpenChange={setExportOpen}
        draft={draft}
        changes={changes}
        canSaveToProduct={canSaveToProduct}
        onSaved={(saved, createdIds) => {
          // What was saved is now the product's own value: future diffs start from it.
          let next = 0;
          setDraft((d) => ({
            ...d,
            originalDescription: saved.some((c) => c.kind === "description") ? d.description.trim() : d.originalDescription,
            descriptionIsAuthored: d.descriptionIsAuthored || saved.some((c) => c.kind === "description"),
            sections: d.sections.map((s) => ({
              ...s,
              rows: s.rows.map((r) => {
                if (r.source.kind === "new" && saved.some((c) => c.kind === "added" && c.label === r.label.trim() && c.value === r.value.trim())) {
                  const itemId = createdIds[next++];
                  return itemId
                    ? { ...r, source: { kind: "spec" as const, itemId }, original: { label: r.label.trim(), value: r.value.trim() } }
                    : r;
                }
                if (r.source.kind === "spec") {
                  const itemId = r.source.itemId;
                  const savedHere = saved.some((c) => (c.kind === "value" || c.kind === "label") && c.itemId === itemId);
                  return savedHere ? { ...r, original: { label: r.label.trim(), value: r.value.trim() } } : r;
                }
                return r;
              }),
            })),
          }));
        }}
      />
    </PageShell>
  );
}


function Section({
  title, description, action, children, flush,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="min-w-0 flex-1">
          {typeof title === "string" ? <h2 className="px-1 text-sm font-semibold">{title}</h2> : title}
          {description && <p className="px-1 text-xs text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={flush ? undefined : "p-3"}>{children}</div>
    </Card>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function IconButton({
  label, onClick, disabled, danger, pressed, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", danger && "text-muted-foreground hover:text-destructive")}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PicturePicker({
  label, hint, options, selected, onToggle,
}: {
  label: string;
  hint?: string;
  options: DraftImageOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              aria-label={`${label} ${i + 1}`}
              onClick={() => onToggle(o.id)}
              className={cn(
                "relative size-16 overflow-hidden rounded-md border bg-muted transition-[box-shadow,opacity] duration-(--dur-hover) ease-(--ease-out) outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                on ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.url} alt="" className="size-full object-contain" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ExportDialog({
  open, onOpenChange, draft, changes, canSaveToProduct, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: DatasheetDraft;
  changes: DraftChange[];
  canSaveToProduct: boolean;
  onSaved: (saved: DraftChange[], createdItemIds: string[]) => void;
}) {
  const t = useTranslations("DatasheetStudio.exportDialog");
  const [format, setFormat] = useState<"pdf" | "pptx">("pdf");
  const saveable = canSaveToProduct ? changes : [];
  // Everything ticked by default; the dialog remounts on each open (see its key).
  const [picked, setPicked] = useState<Set<number>>(() => new Set(saveable.map((_, i) => i)));
  const [isPending, startTransition] = useTransition();

  async function download() {
    const res = await fetch(`/api/products/${draft.productId}/datasheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, format }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? t("failed"));
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.productCode.replace(/[^\w.-]+/g, "_") || "datasheet"}.${format}`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function go(save: boolean) {
    startTransition(async () => {
      try {
        if (save) {
          const chosen = saveable.filter((_, i) => picked.has(i));
          const result = await saveDatasheetToProduct(draft.productId, changesToPayload(chosen));
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          onSaved(chosen, result.data.createdItemIds);
          toast.success(t("saved", { count: chosen.length }));
          if (result.data.arabicToReview.length > 0) {
            toast.warning(t("arabicToReview", { labels: result.data.arabicToReview.join("، ") }), { duration: 10_000 });
          }
        }
        await download();
        toast.success(t("downloaded"));
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("failed"));
      }
    });
  }

  const describe = (change: DraftChange) => {
    switch (change.kind) {
      case "description":
        return { title: t("change.description"), detail: change.after };
      case "value":
        return { title: change.label, detail: `${change.before}  →  ${change.after}` };
      case "label":
        return { title: t("change.label"), detail: `${change.before}  →  ${change.after}` };
      case "added":
        return { title: t("change.added", { group: change.groupName }), detail: `${change.label}: ${change.value}` };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("format")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["pdf", "pptx"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded-md border px-3 py-2 text-start text-sm transition-colors duration-(--dur-hover) ease-(--ease-out) outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  format === f ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted",
                )}
              >
                {t(`formats.${f}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {saveable.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("saveQuestion", { count: saveable.length })}</p>
            <p className="text-xs text-muted-foreground">{t("saveExplain")}</p>
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
              {saveable.map((change, i) => {
                const { title, detail } = describe(change);
                return (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1 hover:bg-muted/60">
                      <Checkbox
                        className="mt-0.5"
                        checked={picked.has(i)}
                        onCheckedChange={(v) =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium">{title}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">{detail}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">{t("fileOnlyNote")}</p>
          </div>
        ) : changes.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPermission")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noChanges")}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {saveable.length > 0 ? (
            <>
              <Button variant="outline" disabled={isPending} onClick={() => go(false)}>
                {t("fileOnly")}
              </Button>
              <Button disabled={isPending || picked.size === 0} onClick={() => go(true)}>
                {isPending ? t("working") : t("saveAndExport", { count: picked.size })}
              </Button>
            </>
          ) : (
            <Button disabled={isPending} onClick={() => go(false)}>
              {isPending ? t("working") : t("exportOnly")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
