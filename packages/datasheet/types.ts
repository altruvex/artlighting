/**
 * Public contract for @repo/datasheet. Deliberately DB-agnostic — no Prisma
 * types leak in here. apps/admin (or any future caller) is responsible for
 * mapping its own data model into this flat, already-labeled shape.
 */

export type ImageRef =
  | { kind: "path"; path: string }
  /** Caller already resolved the image to a base64 data URI. */
  | { kind: "data"; dataUri: string };

export interface LabelValueRow {
  label: string;
  value: string;
  /** Renders the value in the gold accent instead of ink — e.g. a standout figure like "30,000 hrs". */
  highlight?: boolean;
}

/**
 * One titled block of label/value rows in the right column.
 *
 * Sections are DATA, not a fixed set, because the reference sheets prove they
 * vary by product type: a spotlight (BO-011-50W) carries SPECIFICATIONS /
 * LAMP DATA / CONTROL UNIT, while a bollard on a pole (BO-100W) carries
 * SPECIFICATIONS / BASE SPECIFICATION / POLE / ARM / LUMINAIRE / CONTROL UNIT.
 * Hard-coding the three spotlight sections would make the second sheet
 * impossible to reproduce.
 */
export interface DatasheetSection {
  /** e.g. "Specifications", "Lamp Data", "Base Specification" — letter-spaced and uppercased at render time. */
  title: string;
  rows: LabelValueRow[];
}

export interface DatasheetProductData {
  /** e.g. "BO-011-50W" */
  productCode: string;
  /** Subtitle line under the product code, e.g. "Bollard — Outdoor Series" */
  categoryLabel: string;
  /** Rendered under the DESCRIPTION heading. Empty string omits the whole section. */
  descriptionText: string;
  mainImage?: ImageRef;
  /**
   * Technical drawings shown under DIMENSIONS, in order.
   *
   * A list rather than a single image because the reference sheets carry a
   * varying number: BO-011-50W has one, BO-014-100W has three (a tall pole
   * elevation beside two stacked detail views). The renderer picks an
   * arrangement from the count, so adding a drawing to a product needs no
   * code or template change.
   */
  dimensionDiagrams?: ImageRef[];
  /** Right-column sections, rendered top to bottom. Sections with no rows are skipped entirely. */
  sections: DatasheetSection[];
  brandLogos?: ImageRef[];
}

export interface DatasheetTokens {
  page: { widthIn: number; heightIn: number };
  colors: {
    ink: string;
    labelGray: string;
    bodyGray: string;
    eyebrowGray: string;
    accentGold: string;
    hairlineFill: string;
    dottedLeader: string;
    white: string;
  };
  fonts: {
    family: string;
  };
  sizes: {
    eyebrow: number;
    code: number;
    sectionTitle: number;
    label: number;
    value: number;
    footerSmall: number;
    footerTiny: number;
  };
  layout: {
    marginX: number;
    headerBarHeight: number;
    footerBarHeight: number;
    leftColX: number;
    leftColWidth: number;
    rightColX: number;
    rightColWidth: number;
    /** Width of the label sub-column within a section row; the value starts right after. */
    labelColWidth: number;
    rowHeight: number;
    sectionTitleToLineGap: number;
    lineToContentGap: number;
    sectionGap: number;
    photo: { x: number; y: number; w: number; h: number };
    /** Vertical breathing room between stacked blocks in the flowing left column. */
    blockGap: number;
  };
}
