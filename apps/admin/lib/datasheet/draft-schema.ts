import { z } from "zod";

/**
 * A datasheet draft as it comes back from the studio. The limits are what a
 * single A4 page can hold anyway; the layout check (checkDatasheetLayout)
 * is the real gate and runs after this.
 */
const text = (max: number) => z.string().max(max);

const rowSchema = z.object({
  id: z.string().min(1).max(64),
  key: z.string().max(64).optional(),
  label: text(80),
  value: text(160),
  highlight: z.boolean(),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("spec"), itemId: z.string().min(1).max(64) }),
    z.object({ kind: z.literal("derived") }),
    z.object({ kind: z.literal("new") }),
  ]),
  original: z.object({ label: text(160), value: text(400) }).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: text(40),
  target: z.enum(["physical", "optical", "electrical", "custom"]),
  rows: z.array(rowSchema).max(30),
});

export const datasheetDraftSchema = z.object({
  productId: z.string().min(1),
  productCode: text(40),
  categoryLabel: text(80),
  description: text(1200),
  originalDescription: text(4000),
  descriptionIsAuthored: z.boolean(),
  sections: z.array(sectionSchema).max(10),
  images: z.object({
    photoId: z.string().nullable(),
    drawingIds: z.array(z.string()).max(4),
    applicationId: z.string().nullable(),
  }),
  showBrandLogo: z.boolean(),
  brand: z.string().nullable(),
});

export type DatasheetDraftInput = z.infer<typeof datasheetDraftSchema>;

/** What "save to the product" writes. Built by the studio from the draft; each item is re-checked on the server. */
export const datasheetChangesSchema = z.object({
  description: z.string().trim().min(1).max(1200).nullable(),
  edits: z
    .array(
      z.object({
        itemId: z.string().min(1).max(64),
        label: z.string().trim().min(1).max(80).optional(),
        value: z.string().trim().min(1).max(160).optional(),
      }),
    )
    .max(200),
  additions: z
    .array(
      z.object({
        groupName: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(160),
      }),
    )
    .max(100),
});

export type DatasheetChanges = z.infer<typeof datasheetChangesSchema>;

export const SECTION_GROUP_NAME: Record<"physical" | "optical" | "electrical", string> = {
  physical: "Physical",
  optical: "Optical",
  electrical: "Electrical",
};

/** One change the studio found, as shown in the save dialog. */
export type DraftChange =
  | { kind: "description"; before: string; after: string }
  | { kind: "value"; itemId: string; label: string; before: string; after: string }
  | { kind: "label"; itemId: string; before: string; after: string }
  | { kind: "added"; groupName: string; label: string; value: string };

/**
 * Everything in the draft that differs from the product and could be saved
 * back to it. Rows removed from the sheet, the title lines and the pictures
 * are file-only by design: hiding a spec on one sheet is not deleting it.
 */
export function diffDraft(draft: DatasheetDraftInput): DraftChange[] {
  const changes: DraftChange[] = [];
  if (draft.description.trim() && draft.description.trim() !== draft.originalDescription.trim()) {
    changes.push({ kind: "description", before: draft.originalDescription, after: draft.description.trim() });
  }
  for (const section of draft.sections) {
    for (const row of section.rows) {
      const label = row.label.trim();
      const value = row.value.trim();
      if (row.source.kind === "spec" && row.original) {
        if (value && value !== row.original.value) {
          changes.push({ kind: "value", itemId: row.source.itemId, label, before: row.original.value, after: value });
        }
        if (label && label !== row.original.label) {
          changes.push({ kind: "label", itemId: row.source.itemId, before: row.original.label, after: label });
        }
      } else if (row.source.kind === "new" && label && value) {
        changes.push({
          kind: "added",
          groupName: section.target === "custom" ? section.title.trim() || "Specifications" : SECTION_GROUP_NAME[section.target],
          label,
          value,
        });
      }
    }
  }
  return changes;
}

export function changesToPayload(changes: DraftChange[]): DatasheetChanges {
  const edits = new Map<string, { itemId: string; label?: string; value?: string }>();
  let description: string | null = null;
  const additions: DatasheetChanges["additions"] = [];
  for (const change of changes) {
    if (change.kind === "description") description = change.after;
    if (change.kind === "value" || change.kind === "label") {
      const edit = edits.get(change.itemId) ?? { itemId: change.itemId };
      if (change.kind === "value") edit.value = change.after;
      else edit.label = change.after;
      edits.set(change.itemId, edit);
    }
    if (change.kind === "added") additions.push({ groupName: change.groupName, label: change.label, value: change.value });
  }
  return { description, edits: [...edits.values()], additions };
}
