import type { DatasheetProductData, ImageRef } from "@repo/datasheet/preview";
import { BRAND_LOGOS } from "@repo/datasheet/preview";

/**
 * The datasheet draft and its mapping to a page — pure, browser-safe. The
 * studio's live preview and the server's export both call mapDraft, so the
 * page on screen and the page in the file come from one function.
 */

export type DraftRowSource =
  /** Read from this SpecItem; a change can be written back to it. */
  | { kind: "spec"; itemId: string }
  /** Derived from another product field (the brand) — file only. */
  | { kind: "derived" }
  /** Added in the studio. Saving creates a new spec in the section's group. */
  | { kind: "new" };

export interface DraftRow {
  id: string;
  /** The spec's language-neutral key, so the sheet can find its headline figures whatever the label says. */
  key?: string;
  label: string;
  value: string;
  highlight: boolean;
  source: DraftRowSource;
  /** What the row said when loaded, so the studio can tell what changed. */
  original?: { label: string; value: string };
}

/** Which of the product's spec groups a new row in this section is saved into. */
export type SectionGroupTarget = "physical" | "optical" | "electrical" | "custom";

export interface DraftSection {
  id: string;
  title: string;
  target: SectionGroupTarget;
  rows: DraftRow[];
}

export interface DatasheetDraft {
  productId: string;
  productCode: string;
  categoryLabel: string;
  description: string;
  /** The description the product itself has (authored, or generated), for "undo". */
  originalDescription: string;
  /** True when the product has its own authored English description. */
  descriptionIsAuthored: boolean;
  sections: DraftSection[];
  images: {
    photoId: string | null;
    drawingIds: string[];
    applicationId: string | null;
  };
  showBrandLogo: boolean;
  brand: string | null;
}

export interface DraftImageOption {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  role: "PHOTO" | "DRAWING" | "APPLICATION" | null;
}

function brandLogo(brand: string | null): ImageRef[] {
  const logo = brand ? BRAND_LOGOS[brand.trim().toLowerCase()] : undefined;
  return logo ? [{ kind: "data", dataUri: logo.dataUri, width: logo.width, height: logo.height }] : [];
}

/** "balcom" / "mister-led" as the brand writes itself. */
function brandName(brand: string | null): string | undefined {
  const key = brand?.trim().toLowerCase();
  if (!key) return undefined;
  return ({ balcom: "Balcom", "mister-led": "Mister LED" } as Record<string, string>)[key] ?? brand!.trim();
}

/**
 * The draft as the renderer takes it. `resolveImage` turns one of the
 * product's image ids into a picture: URLs with their pixel size for the
 * preview, fetched bytes for the export. Ids it does not know resolve to
 * nothing, so a draft can never point the server at an arbitrary URL.
 */
export function mapDraft(
  draft: DatasheetDraft,
  resolveImage: (id: string) => ImageRef | undefined
): DatasheetProductData {
  return {
    productCode: draft.productCode,
    brandName: brandName(draft.brand),
    categoryLabel: draft.categoryLabel,
    descriptionText: draft.description,
    mainImage: draft.images.photoId ? resolveImage(draft.images.photoId) : undefined,
    applicationImage: draft.images.applicationId ? resolveImage(draft.images.applicationId) : undefined,
    dimensionDiagrams: draft.images.drawingIds
      .slice(0, 4)
      .map((id) => resolveImage(id))
      .filter((d): d is ImageRef => Boolean(d)),
    brandLogos: draft.showBrandLogo ? brandLogo(draft.brand) : [],
    sections: draft.sections.map((s) => ({
      id: s.id,
      title: s.title,
      rows: s.rows
        .filter((r) => r.label.trim() && r.value.trim())
        .map((r) => ({ key: r.key, label: r.label.trim(), value: r.value.trim(), highlight: r.highlight })),
    })),
  };
}
