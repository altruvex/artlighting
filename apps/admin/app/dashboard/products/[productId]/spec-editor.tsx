"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { parseSpecText } from "@repo/catalog/spec-text";
import { formatSpecValue } from "@repo/catalog/spec-format";
import { layoutFieldFor, layoutGroupIndex, SPEC_LAYOUT } from "@repo/catalog/spec-layout";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { saveProductSpecs, type ProductSpecChanges } from "@/lib/actions/products";

/**
 * The product editor's specifications: the product's SpecGroups, laid out
 * the way the product page groups them, with every catalogue spec the
 * product does not have yet shown as an empty row to fill.
 *
 * A value is typed once, in English. Saving sends it through
 * `@repo/catalog`, which reads it into a number or a vocabulary entry the
 * same way the backfill did, so the Arabic page renders it by itself — the
 * line under each field shows what that will be before anything is saved.
 * Only a value that stays free text, or a vocabulary entry the catalogue has
 * never seen, has an Arabic of its own, and only then is the Arabic asked for.
 */

type SpecKind = "MEASUREMENT" | "RANGE" | "CHOICE" | "TEXT";
type SpecComparator = "EXACT" | "AT_LEAST" | "AT_MOST" | "APPROX";
type Bilingual = { en: string; ar: string };

export interface EditorSpecItem {
  id: string;
  key: string | null;
  kind: SpecKind;
  unit: string | null;
  comparator: SpecComparator;
  optionKey: string | null;
  label: Bilingual;
  /** TEXT only: the per-language value. */
  text: { en: string | null; ar: string | null };
  /** Serialized Decimals (see @repo/money). */
  measurements: { value: string; valueMax: string | null; conditionValue: string | null; conditionUnit: string | null }[];
}

export interface EditorSpecGroup {
  id: string;
  name: Bilingual;
  items: EditorSpecItem[];
}

export interface SpecVocabularyEntry {
  key: string;
  en: string;
  ar: string | null;
}

interface Row {
  uid: string;
  /** Null for a row that is not saved yet. */
  itemId: string | null;
  key: string | null;
  /** A row the catalogue layout does not know: its name is typed, in both languages. */
  custom: boolean;
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  initial: { labelEn: string; labelAr: string; valueEn: string; valueAr: string };
  removed: boolean;
  /** Left a required field once: only then is it marked invalid, not while still being filled in. */
  touched: boolean;
}

interface Group {
  nameEn: string;
  nameAr: string;
  rows: Row[];
}

const rank = (index: number) => (index < 0 ? Number.POSITIVE_INFINITY : index);

/** The English a stored value reads as — what the field starts with. */
function englishOf(item: EditorSpecItem, vocabulary: Map<string, SpecVocabularyEntry>): string {
  if (item.kind === "TEXT") return item.text.en ?? "";
  if (item.kind === "CHOICE") return (item.optionKey && vocabulary.get(item.optionKey)?.en) || "";
  const { kind, unit, comparator, measurements } = item;
  const shown = formatSpecValue({ kind, unit, comparator, measurements }, "en");
  return shown === "—" ? "" : shown;
}

function buildGroups(groups: EditorSpecGroup[], vocabulary: Map<string, SpecVocabularyEntry>): Group[] {
  const present = new Set(groups.flatMap((group) => group.items.map((item) => item.key)));

  const result: Group[] = groups.map((group) => ({
    nameEn: group.name.en,
    nameAr: group.name.ar,
    rows: group.items.map((item) => {
      const initial = {
        labelEn: item.label.en,
        labelAr: item.label.ar,
        valueEn: englishOf(item, vocabulary),
        valueAr: item.kind === "TEXT" ? (item.text.ar ?? "") : "",
      };
      return {
        uid: item.id,
        itemId: item.id,
        key: item.key,
        custom: !layoutFieldFor(item.key),
        ...initial,
        initial,
        removed: false,
        touched: false,
      };
    }),
  }));

  // Every catalogue spec the product lacks, as an empty row in its group.
  for (const layout of SPEC_LAYOUT) {
    let group = result.find((candidate) => candidate.nameEn === layout.en);
    if (!group) {
      group = { nameEn: layout.en, nameAr: layout.ar, rows: [] };
      result.push(group);
    }
    for (const field of layout.fields) {
      if (present.has(field.key)) continue;
      const initial = { labelEn: field.en, labelAr: field.ar, valueEn: "", valueAr: "" };
      group.rows.push({ uid: `new:${field.key}`, itemId: null, key: field.key, custom: false, ...initial, initial, removed: false, touched: false });
    }
  }

  // Array.sort is stable: the product's own order holds within a rank.
  for (const group of result) {
    group.rows.sort((a, b) => rank(layoutFieldFor(a.key)?.fieldIndex ?? -1) - rank(layoutFieldFor(b.key)?.fieldIndex ?? -1));
  }
  return result.sort((a, b) => rank(layoutGroupIndex(a.nameEn)) - rank(layoutGroupIndex(b.nameEn)));
}

type Reading =
  | { kind: "empty" }
  | { kind: "structured"; arabic: string }
  | { kind: "knownOption"; arabic: string | null }
  | { kind: "newOption" }
  | { kind: "text"; unreadFigure: boolean };

/** What a row's English will be stored as — the same parser the server runs. */
function readRow(row: Row, vocabulary: Map<string, SpecVocabularyEntry>): Reading {
  const english = row.valueEn.trim();
  if (!english) return { kind: "empty" };
  const parsed = parseSpecText(row.key, english);
  if (parsed.kind === "CHOICE") {
    const known = parsed.optionKey ? vocabulary.get(parsed.optionKey) : undefined;
    return known ? { kind: "knownOption", arabic: known.ar } : { kind: "newOption" };
  }
  if (parsed.kind === "TEXT") return { kind: "text", unreadFigure: !row.custom };
  return { kind: "structured", arabic: formatSpecValue(parsed, "ar") };
}

const needsArabic = (reading: Reading) => reading.kind === "newOption" || reading.kind === "text";
const isRemoval = (row: Row) => row.itemId !== null && (row.removed || row.valueEn.trim() === "");

function isDirty(row: Row): boolean {
  if (isRemoval(row)) return true;
  if (row.itemId === null) return row.valueEn.trim() !== "";
  return (
    row.valueEn.trim() !== row.initial.valueEn.trim() ||
    row.valueAr.trim() !== row.initial.valueAr.trim() ||
    row.labelEn.trim() !== row.initial.labelEn.trim() ||
    row.labelAr.trim() !== row.initial.labelAr.trim()
  );
}

/** A changed row that cannot be saved as it stands. */
function problemOf(row: Row, reading: Reading): "arabic" | "label" | null {
  if (!isDirty(row) || isRemoval(row) || reading.kind === "empty") return null;
  if (row.custom && (!row.labelEn.trim() || !row.labelAr.trim())) return "label";
  if (needsArabic(reading) && !row.valueAr.trim()) return "arabic";
  return null;
}

function changesFrom(groups: Group[], vocabulary: Map<string, SpecVocabularyEntry>): ProductSpecChanges {
  const changes: ProductSpecChanges = { edits: [], additions: [], removals: [] };
  for (const group of groups) {
    for (const row of group.rows) {
      if (!isDirty(row)) continue;
      if (isRemoval(row)) {
        changes.removals.push(row.itemId!);
        continue;
      }
      const reading = readRow(row, vocabulary);
      const arabic = needsArabic(reading) ? row.valueAr.trim() : undefined;
      if (row.itemId === null) {
        changes.additions.push({
          groupName: group.nameEn,
          ...(row.custom ? { label: row.labelEn.trim(), labelAr: row.labelAr.trim() } : { key: row.key! }),
          value: row.valueEn.trim(),
          ...(arabic ? { valueAr: arabic } : {}),
        });
        continue;
      }
      const edit: ProductSpecChanges["edits"][number] = { itemId: row.itemId };
      const valueChanged = row.valueEn.trim() !== row.initial.valueEn.trim();
      if (valueChanged) edit.value = row.valueEn.trim();
      if (arabic && (valueChanged || arabic !== row.initial.valueAr.trim())) edit.valueAr = arabic;
      if (row.custom && row.labelEn.trim() !== row.initial.labelEn.trim()) edit.label = row.labelEn.trim();
      if (row.custom && row.labelAr.trim() !== row.initial.labelAr.trim()) edit.labelAr = row.labelAr.trim();
      if (Object.keys(edit).length > 1) changes.edits.push(edit);
    }
  }
  return changes;
}

export function SpecEditor({
  productId,
  groups: savedGroups,
  vocabulary: vocabularyList,
}: {
  productId: string;
  groups: EditorSpecGroup[];
  vocabulary: SpecVocabularyEntry[];
}) {
  const t = useTranslations("ProductEditor.specifications");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const isArabic = locale.startsWith("ar");
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const vocabulary = useMemo(() => new Map(vocabularyList.map((entry) => [entry.key, entry])), [vocabularyList]);
  const [groups, setGroups] = useState(() => buildGroups(savedGroups, vocabulary));

  const readings = useMemo(
    () => new Map(groups.flatMap((group) => group.rows.map((row) => [row.uid, readRow(row, vocabulary)] as const))),
    [groups, vocabulary],
  );
  const changes = useMemo(() => changesFrom(groups, vocabulary), [groups, vocabulary]);
  const changeCount = changes.edits.length + changes.additions.length + changes.removals.length;
  const problems = groups.flatMap((group) => group.rows).filter((row) => problemOf(row, readings.get(row.uid)!) !== null);

  function updateRow(uid: string, patch: Partial<Row>) {
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        rows: group.rows.map((row) => (row.uid === uid ? { ...row, ...patch } : row)),
      })),
    );
  }

  function addRow(groupName: string) {
    const initial = { labelEn: "", labelAr: "", valueEn: "", valueAr: "" };
    const row: Row = { uid: `custom:${crypto.randomUUID()}`, itemId: null, key: null, custom: true, ...initial, initial, removed: false, touched: false };
    setGroups((current) => current.map((group) => (group.nameEn === groupName ? { ...group, rows: [...group.rows, row] } : group)));
  }

  function dropRow(uid: string) {
    setGroups((current) => current.map((group) => ({ ...group, rows: group.rows.filter((row) => row.uid !== uid) })));
  }

  function save() {
    startSaving(async () => {
      try {
        const result = await saveProductSpecs(productId, changes);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (result.data.arabicToReview.length > 0) {
          toast.warning(t("arabicToReview", { labels: result.data.arabicToReview.join("، ") }));
        } else {
          toast.success(t("saved"));
        }
        router.refresh();
      } catch (error) {
        console.error("Spec save failed", error);
        toast.error(tCommon("genericError"));
      }
    });
  }

  return (
    <div className="@container space-y-6">
      {groups.map((group) => {
        const hasValues = group.rows.some((row) => row.valueEn.trim() !== "" && !isRemoval(row));
        return (
          <fieldset key={group.nameEn} className="min-w-0 space-y-3">
            <legend className="flex w-full items-baseline justify-between gap-3 border-b pb-1.5">
              <span className="text-sm font-semibold">{isArabic ? group.nameAr : group.nameEn}</span>
              <span className="text-xs text-muted-foreground" lang={isArabic ? "en" : "ar"}>
                {isArabic ? group.nameEn : group.nameAr}
              </span>
            </legend>
            {!hasValues && <p className="text-xs text-muted-foreground">{t("groupEmpty")}</p>}
            <div className="divide-y">
              {group.rows.map((row) => (
                <SpecRow
                  key={row.uid}
                  row={row}
                  reading={readings.get(row.uid)!}
                  problem={problemOf(row, readings.get(row.uid)!)}
                  isArabic={isArabic}
                  disabled={isSaving}
                  onChange={(patch) => updateRow(row.uid, patch)}
                  onDrop={() => dropRow(row.uid)}
                />
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => addRow(group.nameEn)}>
              <PlusIcon className="size-4" aria-hidden />
              {t("addRow")}
            </Button>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <p className={cn("me-auto text-xs", problems.length > 0 ? "text-warning" : "text-muted-foreground")} aria-live="polite">
          {problems.length > 0 ? t("problems", { count: problems.length }) : t("changes", { count: changeCount })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSaving || changeCount === 0}
          onClick={() => setGroups(buildGroups(savedGroups, vocabulary))}
        >
          {t("discard")}
        </Button>
        <Button type="button" size="sm" disabled={isSaving || changeCount === 0 || problems.length > 0} onClick={save}>
          {isSaving && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
          {isSaving ? tCommon("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

function SpecRow({
  row,
  reading,
  problem,
  isArabic,
  disabled,
  onChange,
  onDrop,
}: {
  row: Row;
  reading: Reading;
  problem: "arabic" | "label" | null;
  isArabic: boolean;
  disabled: boolean;
  onChange: (patch: Partial<Row>) => void;
  onDrop: () => void;
}) {
  const t = useTranslations("ProductEditor.specifications");
  const id = useId();
  const removal = isRemoval(row);
  const label = (isArabic ? row.labelAr : row.labelEn) || row.labelEn || t("newRow");
  const otherLabel = isArabic ? row.labelEn : row.labelAr;
  const hintId = `${id}-hint`;

  return (
    <div className="grid gap-x-4 gap-y-2 py-3 @xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      {row.custom ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`${id}-label-en`} className="text-xs text-muted-foreground">
              {t("customLabelEn")}
            </Label>
            <Input
              id={`${id}-label-en`}
              lang="en"
              dir="ltr"
              disabled={disabled || removal}
              value={row.labelEn}
              aria-invalid={row.touched && problem === "label" && !row.labelEn.trim()}
              onBlur={() => onChange({ touched: true })}
              onChange={(e) => onChange({ labelEn: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-label-ar`} className="text-xs text-muted-foreground">
              {t("customLabelAr")}
            </Label>
            <Input
              id={`${id}-label-ar`}
              lang="ar"
              dir="rtl"
              disabled={disabled || removal}
              value={row.labelAr}
              aria-invalid={row.touched && problem === "label" && !row.labelAr.trim()}
              onBlur={() => onChange({ touched: true })}
              onChange={(e) => onChange({ labelAr: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="min-w-0 @xl:pt-2">
          <Label htmlFor={`${id}-value`} className={cn(removal && "text-muted-foreground line-through")}>
            {label}
          </Label>
          <p className="text-xs text-muted-foreground" lang={isArabic ? "en" : "ar"}>
            {otherLabel}
          </p>
        </div>
      )}

      <div className="min-w-0 space-y-1.5">
        {row.custom && (
          <Label htmlFor={`${id}-value`} className="text-xs text-muted-foreground">
            {t("valueEn")}
          </Label>
        )}
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-value`}
            lang="en"
            dir="ltr"
            placeholder={t("notSet")}
            disabled={disabled || row.removed}
            aria-describedby={hintId}
            className={cn("tabular-nums", removal && "text-muted-foreground line-through")}
            value={row.valueEn}
            onChange={(e) => onChange({ valueEn: e.target.value })}
          />
          {row.itemId !== null ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={disabled}
              aria-label={removal ? t("undoRemove", { label }) : t("remove", { label })}
              onClick={() =>
                removal
                  ? onChange({ removed: false, valueEn: row.valueEn.trim() ? row.valueEn : row.initial.valueEn })
                  : onChange({ removed: true })
              }
            >
              {removal ? <Undo2Icon className="size-4" aria-hidden /> : <Trash2Icon className="size-4" aria-hidden />}
            </Button>
          ) : row.custom ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={disabled}
              aria-label={t("remove", { label })}
              onClick={onDrop}
            >
              <Trash2Icon className="size-4" aria-hidden />
            </Button>
          ) : (
            // Keeps the fields in one column whether or not a row can be removed.
            <span className="size-9 shrink-0" aria-hidden />
          )}
        </div>

        <div id={hintId} className="text-xs">
          {removal ? (
            <p className="text-danger">{t("willRemove")}</p>
          ) : reading.kind === "structured" || reading.kind === "knownOption" ? (
            <p className="text-muted-foreground">
              {t("arabicPreview")}{" "}
              {/* dir="auto", as the product page renders it: "≥ ٠٫٥" has no
                  strong letter and stays left-to-right; "١٥ وات" turns. */}
              <bdi lang="ar" dir="auto" className="text-foreground">
                {reading.arabic ?? "—"}
              </bdi>
            </p>
          ) : reading.kind === "newOption" ? (
            <p className="text-warning">{t("newOption")}</p>
          ) : reading.kind === "text" && reading.unreadFigure ? (
            <p className="text-warning">{t("notAFigure")}</p>
          ) : null}
        </div>

        {!removal && needsArabic(reading) && (
          <div className="space-y-1">
            <Label htmlFor={`${id}-value-ar`} className="text-xs text-muted-foreground">
              {reading.kind === "newOption" ? t("arabicOptionName") : t("valueAr")}
            </Label>
            <Input
              id={`${id}-value-ar`}
              lang="ar"
              dir="rtl"
              disabled={disabled}
              value={row.valueAr}
              aria-invalid={row.touched && problem === "arabic"}
              onBlur={() => onChange({ touched: true })}
              onChange={(e) => onChange({ valueAr: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
