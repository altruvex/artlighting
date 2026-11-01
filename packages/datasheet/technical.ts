import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetSection, LabelValueRow } from "./types";
import { imageDimensions, placeImage } from "./sections/_image";
import {
  COLOR,
  CONTENT_W,
  EYEBROW,
  FLOOR,
  MARGIN,
  RIGHT_EDGE,
  ROW_PAD,
  SECTION_HEAD_H,
  drawLines,
  drawPageFooter,
  drawPageHeader,
  drawSectionHead,
  drawTable,
  drawText,
  fitSize,
  lineH,
  measureGroup,
  measureRow,
  monthYear,
  tableHeight,
  widthOf,
  wrap,
  type MeasuredRow,
} from "./elegant/system";

/**
 * The luminaire data sheet: one A4 page on the document design system
 * (elegant/system.ts). Category eyebrow, the code in light display type with
 * the power and flux as the headline beside it, then three numbered
 * sections — the headline figures beside the photo, the grouped technical
 * tables in two columns, the drawings with the notes.
 *
 * Every block starts under the one above it, at the height its own text
 * takes; when a product has more to say than the page holds, the rows, the
 * photo and the drawings tighten in steps before the page gives up.
 */

const PHOTO_W = 3.0;
const KEY_X = MARGIN + 3.18;
const KEY_W = RIGHT_EDGE - KEY_X;
const KEY_LABEL_W = 1.84;
const COL_GAP = 0.35;
const COL_W = (CONTENT_W - COL_GAP) / 2;
const TECH_LABEL_W = 1.68;
const NOTE = { size: 7.5, weight: "Light" as const, color: COLOR.muted };

const NOTE_NOMINAL = "All values are nominal. Specifications are subject to change without prior notice.";
const NOTE_REQUEST = "Dimensional drawing available on request from engineering@artlighting-eg.com.";
const NOTE_FLUX = "Luminous flux applies to all CCT variants.";

/** How tight the page is drawn: row padding, gap before a section, photo and drawing heights. */
const LEVELS = [
  { pad: ROW_PAD[0], gap: 0.36, photo: 2.45, drawing: 2.2 },
  { pad: ROW_PAD[1], gap: 0.3, photo: 2.15, drawing: 1.85 },
  { pad: ROW_PAD[2], gap: 0.24, photo: 1.85, drawing: 1.5 },
] as const;
type Level = (typeof LEVELS)[number];
const MIN_DRAWING = 1.35;
const MIN_BESIDE = 1.0;
const DRAWING_GAP = 0.14;
const DRAWING_INSET = 0.1;
const DRAWING_NOTE_GAP = 0.1;

const TITLE = { max: 30, min: 18 };
/** The flux under the headline power. */
const HEADLINE_SUB = { size: 7.5, spacing: 2.6 };
const SUBTITLE = { size: 10.5, weight: "Light" as const, color: COLOR.ink };

/**
 * "14,600 lm (3,000 K) / 14,600 lm (4,000 K) / …" is one figure when every
 * colour temperature gives the same flux — shown as "14,600 lm" with a note,
 * as the reference does. Different figures are left exactly as they are.
 */
function collapseFlux(value: string): string | null {
  const figures = [...value.matchAll(/([\d,]+(?:\.\d+)?)\s*lm\s*\(/g)].map((m) => m[1]);
  if (figures.length < 2 || figures.some((f) => f !== figures[0])) return null;
  return `${figures[0]} lm`;
}

interface Plan {
  level: Level;
  title: { size: number; lines: string[]; y: number; w: number };
  subtitle: { lines: string[]; y: number };
  headline: { value: string; sub: string | null; w: number } | null;
  key: { headY: number; top: number; rows: MeasuredRow[]; note: string | null; photoH: number };
  tech: { headY: number; top: number; columns: [MeasuredRow[], MeasuredRow[]] } | null;
  dims: { headY: number; top: number; drawingH: number; notes: string[]; notesY: number };
  /** Drawings moved beside the photo, under the key rows, when the page has no room for them below. */
  beside: { y: number; h: number } | null;
  fits: boolean;
}

function keyRows(section: DatasheetSection | undefined): { rows: LabelValueRow[]; note: string | null } {
  if (!section) return { rows: [], note: null };
  let note: string | null = null;
  const rows = section.rows.map((row) => {
    if (row.key !== "luminousFlux") return row;
    const single = collapseFlux(row.value);
    if (!single) return row;
    note = NOTE_FLUX;
    return { ...row, value: single };
  });
  return { rows, note };
}

/**
 * The technical groups in two columns, in their own order, split where the
 * taller column is shortest.
 */
function splitColumns(groups: MeasuredRow[][]): [MeasuredRow[], MeasuredRow[]] {
  if (groups.length <= 1) return [groups.flat(), []];
  let best: [MeasuredRow[], MeasuredRow[]] = [groups.flat(), []];
  let bestH = Infinity;
  for (let k = 1; k < groups.length; k++) {
    const left = groups.slice(0, k).flat();
    const right = groups.slice(k).flat();
    const h = Math.max(tableHeight(left), tableHeight(right));
    if (h < bestH) {
      bestH = h;
      best = [left, right];
    }
  }
  return best;
}

function plan(data: DatasheetProductData, level: Level, besidePhoto = false): Plan {
  const keySection = data.sections.find((s) => s.id === "key" && s.rows.length > 0);
  const power = keySection?.rows.find((r) => r.key === "maximumWattage")?.value;
  const flux = keySection?.rows.find((r) => r.key === "luminousFlux")?.value?.trim();
  const fluxSingle = flux ? (collapseFlux(flux) ?? (/^[\d,.]+\s*lm$/.test(flux) ? flux : null)) : null;

  // Headline on the right: the power, and under it the flux when it is one figure.
  const headline = power
    ? {
        value: power,
        sub: fluxSingle,
        w: Math.max(widthOf(power, TITLE.max, "Light"), fluxSingle ? widthOf(fluxSingle.toUpperCase(), HEADLINE_SUB.size, "Regular", HEADLINE_SUB.spacing) : 0) + 0.02,
      }
    : null;

  // Title: the code in light display type, as large as the room beside the headline allows.
  const titleW = CONTENT_W - (headline ? headline.w + 0.3 : 0);
  const size = fitSize(data.productCode, titleW, TITLE.max, TITLE.min);
  const titleLines = wrap(data.productCode, titleW, size, "Light");
  const titleY = 1.46;
  const subtitleY = titleY + titleLines.length * lineH(size) + 0.1;
  const subtitle = data.descriptionText.trim() ? wrap(data.descriptionText.trim(), titleW, SUBTITLE.size, SUBTITLE.weight) : [];
  const headlineBottom = headline ? titleY + 0.14 + lineH(TITLE.max) + (headline.sub ? lineH(HEADLINE_SUB.size) : 0) : 0;
  const openingBottom = Math.max(subtitleY + subtitle.length * lineH(SUBTITLE.size), headlineBottom);

  // 01 Luminaire data
  const hasPhoto = Boolean(data.mainImage);
  const tableW = hasPhoto ? KEY_W : CONTENT_W;
  const { rows, note } = keyRows(keySection);
  const measuredKey = rows.map((row) => measureRow(row, KEY_LABEL_W, tableW - KEY_LABEL_W, level.pad));
  const keyHeadY = openingBottom + level.gap;
  const keyTop = keyHeadY + SECTION_HEAD_H + 0.02;
  const noteH = note ? 0.08 + lineH(NOTE.size) : 0;
  const keyBottom = Math.max(hasPhoto ? keyTop + level.photo : keyTop, keyTop + tableHeight(measuredKey) + noteH);
  const drawings = data.dimensionDiagrams ?? [];
  const besideY = keyTop + tableHeight(measuredKey) + noteH + 0.2;
  const beside = besidePhoto && hasPhoto && drawings.length ? { y: besideY, h: Math.min(level.drawing, keyBottom - besideY) } : null;

  // 02 Technical data
  const groups = data.sections.filter((s) => s.id !== "key" && s.rows.length > 0);
  let tech: Plan["tech"] = null;
  let y = keyBottom;
  if (groups.length) {
    const measured = groups.map((section) => [
      measureGroup(section.title, COL_W, level.pad),
      ...section.rows.map((row) => measureRow(row, TECH_LABEL_W, COL_W - TECH_LABEL_W, level.pad)),
    ]);
    const columns = splitColumns(measured);
    const headY = y + level.gap;
    const top = headY + SECTION_HEAD_H + 0.02;
    tech = { headY, top, columns };
    y = top + Math.max(tableHeight(columns[0]), tableHeight(columns[1]));
  }

  // 03 Dimensions — only the closing note when the drawings sit beside the photo.
  const below = beside ? [] : drawings;
  const dimsHeadY = y + level.gap;
  const dimsTop = beside ? dimsHeadY : dimsHeadY + SECTION_HEAD_H + 0.14;
  const notes = [...(drawings.length ? [] : [NOTE_REQUEST]), NOTE_NOMINAL].flatMap((n) => wrap(n, CONTENT_W, NOTE.size, NOTE.weight));
  const notesH = notes.length * lineH(NOTE.size);
  const drawingH = below.length ? Math.min(level.drawing, FLOOR - dimsTop - DRAWING_NOTE_GAP - notesH) : 0;
  const bottom = dimsTop + (below.length ? drawingH + DRAWING_NOTE_GAP : 0) + notesH;

  return {
    level,
    title: { size, lines: titleLines, y: titleY, w: titleW },
    subtitle: { lines: subtitle, y: subtitleY },
    headline,
    key: { headY: keyHeadY, top: keyTop, rows: measuredKey, note, photoH: level.photo },
    tech,
    dims: { headY: dimsHeadY, top: dimsTop, drawingH, notes, notesY: dimsTop + (below.length ? drawingH + DRAWING_NOTE_GAP : 0) },
    beside,
    fits: bottom <= FLOOR + 0.001 && (beside ? beside.h >= MIN_BESIDE : !drawings.length || drawingH >= MIN_DRAWING),
  };
}

function fittedPlan(data: DatasheetProductData): Plan {
  let last = plan(data, LEVELS[0]);
  for (const level of LEVELS) {
    last = plan(data, level);
    if (last.fits) return last;
  }
  // No room below: a long spec list next to a short key table leaves space beside the photo.
  for (const level of LEVELS) {
    const beside = plan(data, level, true);
    if (beside.fits) return beside;
  }
  return last;
}

export interface TechnicalLayoutReport {
  /** Even at the tightest level the page runs into the footer. */
  specsOverflow: boolean;
  /** The description is a large part of why. */
  descriptionTooLong: boolean;
}

export function checkTechnicalLayout(data: DatasheetProductData): TechnicalLayoutReport {
  const p = fittedPlan(data);
  return { specsOverflow: !p.fits, descriptionTooLong: !p.fits && p.subtitle.lines.length > 4 };
}

export function drawTechnicalDatasheet(slide: PptxGenJS.Slide, data: DatasheetProductData, date = new Date()): void {
  const p = fittedPlan(data);
  slide.background = { color: "FFFFFF" };

  drawPageHeader(slide, "Luminaire data sheet", monthYear(date));

  // Opening: category, code, description; the headline figures on the right.
  if (data.categoryLabel.trim()) drawText(slide, data.categoryLabel, MARGIN, 1.3, p.title.w, { ...EYEBROW, color: COLOR.gold });
  drawLines(slide, p.title.lines, MARGIN, p.title.y, p.title.w, { size: p.title.size, weight: "Light" });
  if (p.subtitle.lines.length) drawLines(slide, p.subtitle.lines, MARGIN, p.subtitle.y, p.title.w, SUBTITLE);
  if (p.headline) {
    const x = RIGHT_EDGE - p.headline.w;
    drawLines(slide, [p.headline.value], x, p.title.y + 0.14, p.headline.w, { size: TITLE.max, weight: "Light", align: "right" });
    if (p.headline.sub) {
      drawLines(slide, [p.headline.sub.toUpperCase()], x, p.title.y + 0.14 + lineH(TITLE.max), p.headline.w, {
        ...HEADLINE_SUB,
        weight: "Regular",
        color: COLOR.muted,
        align: "right",
      });
    }
  }

  // 01 Luminaire data
  drawSectionHead(slide, 1, data.sections.find((s) => s.id === "key")?.title ?? "Luminaire data", p.key.headY);
  if (data.mainImage) placeImage(slide, data.mainImage, { x: MARGIN, y: p.key.top + 0.08, w: PHOTO_W, h: p.key.photoH - 0.08 });
  const tableX = data.mainImage ? KEY_X : MARGIN;
  const tableW = data.mainImage ? KEY_W : CONTENT_W;
  if (p.beside) drawDrawingRow(slide, data.dimensionDiagrams ?? [], tableX, p.beside.y, p.beside.h, tableW);
  const keyEnd = drawTable(slide, p.key.rows, { x: tableX, y: p.key.top, w: tableW, labelW: KEY_LABEL_W, pad: p.level.pad });
  if (p.key.note) drawLines(slide, [p.key.note], tableX, keyEnd + 0.08, tableW, NOTE);

  // 02 Technical data
  if (p.tech) {
    drawSectionHead(slide, 2, "Technical data", p.tech.headY);
    p.tech.columns.forEach((rows, i) =>
      drawTable(slide, rows, { x: MARGIN + i * (COL_W + COL_GAP), y: p.tech!.top, w: COL_W, labelW: TECH_LABEL_W, pad: p.level.pad }),
    );
  }

  // 03 Dimensions
  if (!p.beside) {
    drawSectionHead(slide, p.tech ? 3 : 2, "Dimensions", p.dims.headY);
    drawDrawingRow(slide, data.dimensionDiagrams ?? [], MARGIN, p.dims.top, p.dims.drawingH, CONTENT_W);
  }
  drawLines(slide, p.dims.notes, MARGIN, p.dims.notesY, CONTENT_W, NOTE);

  drawPageFooter(slide, 1, 1);
}

/**
 * The drawings in one row of hairline frames, each as wide as its drawing
 * needs at the row's height (capped at a third of the row), so a tall
 * drawing is not lost in an empty box.
 */
function drawDrawingRow(slide: PptxGenJS.Slide, drawings: DatasheetProductData["dimensionDiagrams"] & {}, x0: number, y: number, h: number, rowW: number): void {
  const shown = drawings.slice(0, 4);
  const cols = Math.max(shown.length, 3);
  const maxW = (rowW - DRAWING_GAP * (cols - 1)) / cols;
  const innerH = h - 2 * DRAWING_INSET;
  let x = x0;
  for (const drawing of shown) {
    const dims = imageDimensions(drawing);
    const w = dims ? Math.min(maxW, Math.max(innerH, innerH * (dims.w / dims.h)) + 2 * DRAWING_INSET) : maxW;
    slide.addShape("rect", { x, y, w, h, line: { color: COLOR.rule, width: 0.5 } });
    placeImage(slide, drawing, { x: x + DRAWING_INSET, y: y + DRAWING_INSET, w: w - 2 * DRAWING_INSET, h: innerH });
    x += w + DRAWING_GAP;
  }
}
