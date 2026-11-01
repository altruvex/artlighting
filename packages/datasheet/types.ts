/**
 * Public contract for @repo/datasheet. Deliberately DB-agnostic — no Prisma
 * types leak in here. apps/admin (or any future caller) is responsible for
 * mapping its own data model into this flat, already-labeled shape.
 */

/**
 * `width`/`height` are the image's own pixel size. A data URI carries it in
 * its bytes; a path cannot, so a caller that knows it (the live preview)
 * passes it, and the image keeps its proportions instead of filling its box.
 */
export type ImageRef =
  | { kind: "path"; path: string; width?: number; height?: number }
  /** Caller already resolved the image to a base64 data URI. */
  | { kind: "data"; dataUri: string; width?: number; height?: number };

export interface LabelValueRow {
  /** Which spec this is ("maximumWattage", "luminousFlux"), when it came from one. */
  key?: string;
  label: string;
  value: string;
  /** Renders the value bold in the gold accent instead of ink — e.g. a standout figure like "30,000 hrs". */
  highlight?: boolean;
}

/**
 * One titled block of label/value rows in the right column.
 *
 * Sections are DATA, not a fixed set, because the reference sheets prove they
 * vary by product type: a spotlight (BO-011-50W) carries SPECIFICATIONS /
 * LAMP DATA / CONTROL UNIT, while a bollard on a pole (BO-100W) carries
 * SPECIFICATIONS / BASE SPECIFICATION / POLE / ARM / LUMINAIRE / CONTROL UNIT.
 */
export interface DatasheetSection {
  /**
   * "key" marks the headline table printed beside the photo (Luminaire
   * data); every other section is one of the grouped Technical data tables.
   */
  id?: string;
  /** e.g. "Electrical", "Mechanical". */
  title: string;
  rows: LabelValueRow[];
}

export interface DatasheetProductData {
  /** e.g. "BO-011-50W" */
  productCode: string;
  /** Printed in the header's Product / Brand / Category block, e.g. "Balcom". */
  brandName?: string;
  /** Subtitle line under the product code, e.g. "Bollard — Outdoor Series" */
  categoryLabel: string;
  /** Rendered under the DESCRIPTION heading. Empty string omits the whole section. */
  descriptionText: string;
  mainImage?: ImageRef;
  /**
   * Technical drawings shown under DIMENSIONS, in order. One fills the whole
   * area (BO-011-50W); more are arranged by count (BO-014-100W has three).
   */
  dimensionDiagrams?: ImageRef[];
  /** Right-column sections, rendered top to bottom. Sections with no rows are skipped entirely. */
  sections: DatasheetSection[];
  brandLogos?: ImageRef[];
  /**
   * The installed/lifestyle shot under BRAND & PARTNERS — the square photo in
   * the reference's lower-right. Omitted, the block shows only the logos.
   */
  applicationImage?: ImageRef;
}

export interface DatasheetTokens {
  page: { widthIn: number; heightIn: number };
  colors: {
    ink: string;
    label: string;
    body: string;
    eyebrow: string;
    gold: string;
    bar: string;
    rule: string;
  };
  font: string;
  sizes: {
    eyebrow: number;
    code: number;
    category: number;
    sectionTitle: number;
    row: number;
    body: number;
    footerMark: number;
    footerContact: number;
    footerSite: number;
    footerTagline: number;
  };
}
