import { type Db, prisma } from "./client";
import { layoutFieldFor, layoutGroupIndex, SPEC_LAYOUT } from "./spec-layout";
import { parseSpecText } from "./spec-text";

/**
 * Writing specs from their English display text — what the datasheet
 * studio does when "save to the product" is ticked, and what the admin
 * product editor does on save.
 *
 * The text goes back through the same parser the backfill used, so "50,000 h"
 * is stored as the number 50000 in hours, not as a string, and the product
 * page (which renders from the structure) shows it in both languages at once.
 * Only a value the parser cannot read is kept as TEXT, and TEXT is the one
 * kind with a per-language string. The same goes for a vocabulary entry the
 * catalogue has not seen before: it needs an Arabic name. A caller that has
 * the Arabic (the product editor) passes it; one that does not (the
 * datasheet, which is English only) gets a warning back instead, because the
 * Arabic side then keeps what it said or reads as the English.
 */

export type SpecWriteWarning =
  /** A TEXT spec: English changed, the Arabic text did not. */
  | { kind: "arabicTextUnchanged"; label: string }
  /** A new vocabulary entry or a new spec: its Arabic reads as the English until translated. */
  | { kind: "arabicCopiedFromEnglish"; label: string };

type SpecItemForWrite = {
  id: string;
  key: string | null;
  kind: string;
  translations: { language: string; label: string }[];
};

function warn(warnings: SpecWriteWarning[], warning: SpecWriteWarning): void {
  if (!warnings.some((w) => w.kind === warning.kind && w.label === warning.label)) warnings.push(warning);
}

async function applyParsedValue(
  tx: Db,
  item: SpecItemForWrite,
  english: string,
  arabic: string | undefined,
  isNew: boolean,
  warnings: SpecWriteWarning[]
): Promise<void> {
  const parsed = parseSpecText(item.key, english);
  const label = item.translations.find((t) => t.language === "en")?.label ?? item.key ?? "";
  const arabicText = arabic?.trim() || null;

  let optionId: string | null = null;
  if (parsed.kind === "CHOICE" && parsed.optionKey) {
    const existing = await tx.specOption.findUnique({ where: { key: parsed.optionKey } });
    if (existing) {
      // Shared vocabulary: an existing entry keeps its Arabic name. Renaming
      // it from one product would rename it on every product that uses it.
      optionId = existing.id;
    } else {
      const created = await tx.specOption.create({
        data: {
          key: parsed.optionKey,
          translations: {
            create: [
              { language: "en", label: english.trim() },
              { language: "ar", label: arabicText ?? english.trim() },
            ],
          },
        },
      });
      optionId = created.id;
      if (!arabicText) warn(warnings, { kind: "arabicCopiedFromEnglish", label });
    }
  }

  await tx.specMeasurement.deleteMany({ where: { itemId: item.id } });
  await tx.specItem.update({
    where: { id: item.id },
    data: {
      kind: parsed.kind,
      unit: parsed.unit ?? layoutFieldFor(item.key)?.field.unit ?? null,
      comparator: parsed.comparator,
      optionId,
      measurements: {
        create: parsed.measurements.map((m, position) => ({
          position,
          value: m.value,
          valueMax: m.valueMax ?? null,
          conditionValue: m.conditionValue ?? null,
          conditionUnit: m.conditionUnit ?? null,
        })),
      },
    },
  });

  // A structured value carries no per-language text; a TEXT one keeps its
  // English here and its Arabic from the caller, or as it was.
  if (parsed.kind !== "TEXT") {
    await tx.specItemTranslation.updateMany({ where: { itemId: item.id }, data: { value: null } });
    return;
  }
  await tx.specItemTranslation.updateMany({
    where: { itemId: item.id, language: "en" },
    data: { value: english.trim() },
  });
  if (arabicText) {
    await tx.specItemTranslation.updateMany({ where: { itemId: item.id, language: "ar" }, data: { value: arabicText } });
  } else if (isNew) {
    await tx.specItemTranslation.updateMany({
      where: { itemId: item.id, language: "ar" },
      data: { value: english.trim() },
    });
    warn(warnings, { kind: "arabicCopiedFromEnglish", label });
  } else {
    warn(warnings, { kind: "arabicTextUnchanged", label });
  }
}

export interface SpecEdit {
  itemId: string;
  /** New English value, when it changed. */
  value?: string;
  /** New English label, when it changed. */
  label?: string;
  /**
   * The Arabic for a value that has one: a TEXT value, or the name of a
   * vocabulary entry the catalogue does not have yet. Ignored for anything
   * that renders from numbers or from an existing entry.
   */
  valueAr?: string;
  /** New Arabic label, when it changed. */
  labelAr?: string;
}

export interface SpecAddition {
  /** The spec group to add to: one of the product's own, found by its English name, or created. */
  groupName: string;
  /**
   * Which catalogue spec this is ("ip", "lifeTime"). A keyed spec is parsed
   * into numbers or a vocabulary entry like the backfilled ones, and takes
   * the catalogue's labels when none are given. Without a key it is free text.
   */
  key?: string;
  label?: string;
  labelAr?: string;
  value: string;
  valueAr?: string;
}

export interface SpecChanges {
  edits: SpecEdit[];
  additions: SpecAddition[];
  /** Item ids to delete. A group left with no items goes with them. */
  removals?: string[];
}

/** "Unranked" — a group or spec the layout does not know sorts after every one it does. */
const rank = (index: number) => (index < 0 ? Number.POSITIVE_INFINITY : index);

/**
 * The position a new row takes so the layout order holds, shifting the rows
 * after it down by one. Rows the layout does not rank keep to the end.
 */
async function makeRoomFor(
  rows: { position: number; rank: number }[],
  newRank: number,
  shift: (from: number) => Promise<unknown>
): Promise<number> {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const next = Number.isFinite(newRank) ? sorted.find((row) => row.rank > newRank) : undefined;
  if (!next) return sorted.length > 0 ? sorted[sorted.length - 1]!.position + 1 : 0;
  await shift(next.position);
  return next.position;
}

async function findOrCreateGroup(tx: Db, productId: string, groupName: string): Promise<string> {
  const groups = await tx.specGroup.findMany({
    where: { productId },
    select: { id: true, position: true, translations: { where: { language: "en" }, select: { name: true } } },
  });
  const existing = groups.find((group) => group.translations[0]?.name === groupName);
  if (existing) return existing.id;

  const position = await makeRoomFor(
    groups.map((group) => ({ position: group.position, rank: rank(layoutGroupIndex(group.translations[0]?.name ?? "")) })),
    rank(layoutGroupIndex(groupName)),
    (from) =>
      tx.specGroup.updateMany({ where: { productId, position: { gte: from } }, data: { position: { increment: 1 } } })
  );
  const layout = SPEC_LAYOUT[layoutGroupIndex(groupName)];
  const created = await tx.specGroup.create({
    data: {
      productId,
      position,
      translations: {
        create: [
          { language: "en", name: groupName },
          { language: "ar", name: layout?.ar ?? groupName },
        ],
      },
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Applies a set of spec changes to one product, all or nothing. Every item
 * id must belong to the product — an id from anywhere else fails the whole
 * write rather than touching another product.
 */
export async function applySpecChanges(
  productId: string,
  changes: SpecChanges,
  db: Db = prisma
): Promise<{ warnings: SpecWriteWarning[]; createdItemIds: string[] }> {
  const { edits, additions } = changes;
  const removals = [...new Set(changes.removals ?? [])];
  const warnings: SpecWriteWarning[] = [];
  const createdItemIds: string[] = [];
  const run = (db as unknown as { $transaction?: <T>(fn: (tx: Db) => Promise<T>) => Promise<T> }).$transaction;

  const body = async (tx: Db) => {
    if (edits.some((edit) => removals.includes(edit.itemId))) {
      throw new Error("A spec cannot be edited and removed in the same change.");
    }
    const ids = [...new Set([...edits.map((e) => e.itemId), ...removals])];
    const items = await tx.specItem.findMany({
      where: { id: { in: ids }, group: { productId } },
      select: { id: true, key: true, kind: true, translations: { select: { language: true, label: true } } },
    });
    if (items.length !== ids.length) throw new Error("A spec in this change does not belong to the product.");
    const byId = new Map(items.map((i) => [i.id, i]));

    if (removals.length > 0) {
      await tx.specItem.deleteMany({ where: { id: { in: removals } } });
      // An empty card on the product page or an empty section on the
      // datasheet is worse than none.
      await tx.specGroup.deleteMany({ where: { productId, items: { none: {} } } });
    }

    for (const edit of edits) {
      const item = byId.get(edit.itemId)!;
      for (const [language, label] of [["en", edit.label], ["ar", edit.labelAr]] as const) {
        if (label?.trim()) {
          await tx.specItemTranslation.updateMany({
            where: { itemId: item.id, language },
            data: { label: label.trim() },
          });
        }
      }
      if (edit.value?.trim()) {
        await applyParsedValue(tx, item, edit.value, edit.valueAr, false, warnings);
      } else if (edit.valueAr?.trim() && item.kind === "TEXT") {
        await tx.specItemTranslation.updateMany({
          where: { itemId: item.id, language: "ar" },
          data: { value: edit.valueAr.trim() },
        });
      }
    }

    for (const addition of additions) {
      const value = addition.value.trim();
      if (!value) continue;
      const groupName = addition.groupName.trim();
      const groupId = await findOrCreateGroup(tx, productId, groupName);
      const layout = layoutFieldFor(addition.key);
      const key = addition.key?.trim() || null;
      const label = addition.label?.trim() || layout?.field.en || key || "";
      if (!label) throw new Error("A new spec needs a label.");
      const labelAr = addition.labelAr?.trim() || layout?.field.ar || null;
      if (!labelAr) warn(warnings, { kind: "arabicCopiedFromEnglish", label });

      const siblings = await tx.specItem.findMany({ where: { groupId }, select: { position: true, key: true } });
      const position = await makeRoomFor(
        siblings.map((item) => ({ position: item.position, rank: rank(layoutFieldFor(item.key)?.fieldIndex ?? -1) })),
        rank(layout?.fieldIndex ?? -1),
        (from) => tx.specItem.updateMany({ where: { groupId, position: { gte: from } }, data: { position: { increment: 1 } } })
      );
      const created = await tx.specItem.create({
        select: { id: true },
        data: {
          groupId,
          key,
          position,
          kind: "TEXT",
          translations: {
            create: [
              { language: "en", label, value: null },
              { language: "ar", label: labelAr ?? label, value: null },
            ],
          },
        },
      });
      createdItemIds.push(created.id);
      await applyParsedValue(
        tx,
        { id: created.id, key, kind: "TEXT", translations: [{ language: "en", label }] },
        value,
        addition.valueAr,
        true,
        warnings
      );
    }
  };

  if (typeof run === "function") await run.call(db, body);
  else await body(db);
  return { warnings, createdItemIds };
}

/** The datasheet studio's entry point: edits and additions, English only. */
export async function applySpecEdits(
  productId: string,
  edits: SpecEdit[],
  additions: SpecAddition[],
  db: Db = prisma
): Promise<{ warnings: SpecWriteWarning[]; createdItemIds: string[] }> {
  return applySpecChanges(productId, { edits, additions }, db);
}
