import type PptxGenJS from "pptxgenjs";
import { JOST_ADVANCE } from "../fonts/metrics";
import { LOGO_IMAGE_DATA_URI } from "../assets/logo-image";

/**
 * The document design system shared by the datasheet and the quotation —
 * the "elegant" sheet (JY-STRESS_Datasheet_Elegant.pdf is the approved
 * reference): Jost in three weights, letter-spaced capitals for everything
 * that labels, a gold hairline under the header, numbered section heads on an
 * ink rule, and a dark strip closing the page.
 *
 * Colours are @repo/ui's globals.css (the storefront and admin theme),
 * converted from OKLCH; the dark strip uses the dark theme's background.
 *
 * Text is measured with Jost's own advance widths (fonts/metrics.ts) and set
 * with an exact line spacing, so a line breaks here exactly where the
 * renderer would break it, and a block is exactly as tall as it is drawn.
 */

export const COLOR = {
  /** --foreground oklch(0.175 0.006 60) */
  ink: "13100E",
  /** --muted-foreground oklch(0.52 0.012 62) */
  muted: "6E6862",
  /** --border oklch(0.885 0.004 70) */
  rule: "DBD9D6",
  /** --muted oklch(0.955 0.004 75) — image placeholders */
  wash: "F2F0ED",
  /** --primary / --gold-600 oklch(0.554 0.121 66.4) — gold on white */
  gold: "A16206",
  /** --destructive oklch(0.577 0.215 27.3) — money taken off: discounts */
  destructive: "DC2626",
  /** --gold-400 oklch(0.76 0.115 76) — gold on the dark strip */
  goldOnDark: "DBA757",
  /** dark theme --background oklch(0.165 0.006 60) */
  strip: "100E0C",
  /** dark theme --muted-foreground oklch(0.73 0.012 70) */
  mutedOnDark: "ADA7A0",
} as const;

export type Weight = "Light" | "Regular" | "Medium";

/** The face names LibreOffice (and PowerPoint, with Jost installed) resolve. */
export const FACE: Record<Weight, string> = { Light: "Jost Light", Regular: "Jost", Medium: "Jost Medium" };

/** A4, the same box as the cover and the old sheets. */
export const PAGE = { w: 7562850 / 914400, h: 10688638 / 914400 };
export const MARGIN = 0.59;
export const CONTENT_W = PAGE.w - 2 * MARGIN;
export const RIGHT_EDGE = PAGE.w - MARGIN;

/** Exact line spacing, as a multiple of the size. Jost's own is 1.445 — too open for tables. */
const LEADING = 1.3;
export const lineH = (size: number) => (size * LEADING) / 72;

/* ---------- measuring ---------- */

const FALLBACK_EM = { Light: 0.52, Regular: 0.54, Medium: 0.56 } as const;

/** Width in inches of one run, including letter spacing (pt per character). */
export function widthOf(text: string, size: number, weight: Weight = "Regular", spacing = 0): number {
  const table = JOST_ADVANCE[weight];
  let em = 0;
  for (const ch of text) em += table[ch] ?? FALLBACK_EM[weight];
  // 2% for kerning pairs and rounding; spacing is added after every character.
  return (em * size * 1.02 + spacing * text.length) / 72;
}

/**
 * Chunks that stay on one line: a unit or a short joiner ("K", "hz", "lm",
 * "/", "·", "~", "+") travels with the word before it.
 */
function chunks(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const glue = out.length > 0 && (word.length <= 2 || /^[/~+|·–—-]$/.test(word));
    if (glue) out[out.length - 1] += ` ${word}`;
    else out.push(word);
  }
  return out;
}

function hardBreak(chunk: string, widthIn: number, size: number, weight: Weight, spacing: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of chunk) {
    if (line && widthOf(line + ch, size, weight, spacing) > widthIn) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

/** Greedy line breaking at safe points; explicit newlines are kept. */
export function wrap(text: string, widthIn: number, size: number, weight: Weight = "Regular", spacing = 0): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    const start = lines.length;
    for (const chunk of chunks(paragraph)) {
      const pieces = widthOf(chunk, size, weight, spacing) > widthIn ? hardBreak(chunk, widthIn, size, weight, spacing) : [chunk];
      for (const piece of pieces) {
        const last = lines.length > start ? lines[lines.length - 1] : undefined;
        if (last !== undefined && widthOf(`${last} ${piece}`, size, weight, spacing) <= widthIn) lines[lines.length - 1] = `${last} ${piece}`;
        else lines.push(piece);
      }
    }
    if (lines.length === start) lines.push("");
  }
  return lines;
}

/** The largest size ≤ `max` at which `text` fits `widthIn` on one line (never below `min`). */
export function fitSize(text: string, widthIn: number, max: number, min: number, weight: Weight = "Light"): number {
  let size = max;
  while (size > min && widthOf(text, size, weight) > widthIn) size -= 0.5;
  return size;
}

/* ---------- drawing ---------- */

export interface TextStyle {
  size: number;
  weight?: Weight;
  color?: string;
  /** Letter spacing in points — the labels' spaced capitals. */
  spacing?: number;
  align?: "left" | "right" | "center";
  caps?: boolean;
}

/** Draws lines already broken by `wrap`; returns their height. */
export function drawLines(slide: PptxGenJS.Slide, lines: string[], x: number, y: number, w: number, style: TextStyle): number {
  const h = lines.length * lineH(style.size);
  const text = lines.join("\n");
  slide.addText(style.caps ? text.toUpperCase() : text, {
    margin: 0,
    x,
    y,
    w,
    h,
    fontFace: FACE[style.weight ?? "Regular"],
    fontSize: style.size,
    color: style.color ?? COLOR.ink,
    charSpacing: style.spacing,
    lineSpacing: style.size * LEADING,
    align: style.align ?? "left",
    valign: "top",
    wrap: true,
  });
  return h;
}

/** Wraps and draws in one step; returns the height. */
export function drawText(slide: PptxGenJS.Slide, text: string, x: number, y: number, w: number, style: TextStyle): number {
  const shown = style.caps ? text.toUpperCase() : text;
  return drawLines(slide, wrap(shown, w, style.size, style.weight, style.spacing), x, y, w, { ...style, caps: false });
}

export function textHeight(text: string, w: number, style: TextStyle): number {
  const shown = style.caps ? text.toUpperCase() : text;
  return wrap(shown, w, style.size, style.weight, style.spacing).length * lineH(style.size);
}

export function rule(slide: PptxGenJS.Slide, x: number, y: number, w: number, color: string = COLOR.rule, pt = 0.5) {
  slide.addShape("line", { x, y, w, h: 0, line: { color, width: pt } });
}

/* ---------- the pieces every page shares ---------- */

/** Labels: spaced Medium capitals. Nothing but the header tagline is set smaller than this. */
export const EYEBROW: TextStyle = { size: 7.5, weight: "Medium", spacing: 2.2, caps: true };

/**
 * Logo, spaced ART LIGHTING with the tagline, and on the right the document's
 * name over one line of detail; a gold hairline under all of it.
 */
export function drawPageHeader(slide: PptxGenJS.Slide, docName: string, detail: string): number {
  slide.addImage({ data: LOGO_IMAGE_DATA_URI, x: MARGIN, y: 0.44, w: 0.44, h: 0.44 });
  drawLines(slide, ["ART LIGHTING"], 1.15, 0.44, 3, { size: 11, weight: "Medium", spacing: 3 });
  drawLines(slide, ["THE LIGHTING AS IT SHOULD BE"], 1.15, 0.67, 3, { size: 7, weight: "Regular", spacing: 1.2, color: COLOR.muted });
  drawLines(slide, [docName.toUpperCase()], RIGHT_EDGE - 3.4, 0.46, 3.4, { size: 7.5, weight: "Medium", spacing: 2.2, align: "right" });
  drawLines(slide, [detail.toUpperCase()], RIGHT_EDGE - 3.4, 0.66, 3.4, { size: 7.5, weight: "Regular", spacing: 2.2, color: COLOR.muted, align: "right" });
  rule(slide, MARGIN, 1.02, CONTENT_W, COLOR.gold, 0.5);
  return 1.02;
}

/** "01  LUMINAIRE DATA" on an ink rule. Returns the rule's y. */
export const SECTION_HEAD_H = 0.2;
export function drawSectionHead(slide: PptxGenJS.Slide, index: number, title: string, y: number): number {
  const number = String(index).padStart(2, "0");
  drawLines(slide, [number], MARGIN, y, 0.34, { ...EYEBROW, size: 8.5, color: COLOR.gold });
  drawLines(slide, [title.toUpperCase()], MARGIN + 0.34, y, CONTENT_W - 0.34, { ...EYEBROW, size: 8.5, spacing: 2.8 });
  const ruleY = y + SECTION_HEAD_H;
  rule(slide, MARGIN, ruleY, CONTENT_W, COLOR.ink, 0.75);
  return ruleY;
}

export const FOOTER_TOP = 10.84;
/** Lowest point page content may reach. */
export const FLOOR = FOOTER_TOP - 0.16;

const ADDRESS = "49 Saqr Quraish Buildings, Sayed Zakaria St., Sheraton, Cairo, Egypt";
const PHONES = "+20 2 2269 3008 · +20 114 899 9042 · +20 114 899 9028 · +20 110 213 1731";
const EMAIL = "engineering@artlighting-eg.com";

/** Contact block and the dark strip with the site and the page count. */
export function drawPageFooter(slide: PptxGenJS.Slide, page: number, pages: number): void {
  drawLines(slide, ["ART LIGHTING"], MARGIN, FOOTER_TOP, 3, { size: 7.5, weight: "Medium", spacing: 2.2 });
  drawLines(slide, [ADDRESS], MARGIN, FOOTER_TOP + 0.19, 3.6, { size: 7.5, weight: "Light", color: COLOR.ink });
  drawLines(slide, [PHONES], RIGHT_EDGE - 4.2, FOOTER_TOP, 4.2, { size: 7.5, weight: "Light", align: "right" });
  drawLines(slide, [EMAIL], RIGHT_EDGE - 4.2, FOOTER_TOP + 0.19, 4.2, { size: 7.5, weight: "Light", align: "right" });

  const stripY = PAGE.h - 0.34;
  slide.addShape("rect", { x: 0, y: stripY, w: PAGE.w, h: 0.34, fill: { color: COLOR.strip }, line: { color: COLOR.strip, width: 0 } });
  const textY = stripY + (0.34 - lineH(7.5)) / 2;
  drawLines(slide, ["ARTLIGHTING-EG.COM"], MARGIN, textY, 3, { size: 7.5, weight: "Medium", spacing: 2.6, color: COLOR.goldOnDark });
  drawLines(slide, [`PAGE ${page} / ${pages}`], RIGHT_EDGE - 2, textY, 2, { size: 7.5, weight: "Regular", spacing: 2.6, color: COLOR.mutedOnDark, align: "right" });
}

/* ---------- label / value tables ---------- */

export const CELL: TextStyle = { size: 9.5, weight: "Light", color: COLOR.muted };
export const CELL_VALUE: TextStyle = { size: 9.5, weight: "Regular", color: COLOR.ink };

export interface Row {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface MeasuredRow {
  kind: "row" | "group";
  label: string[];
  value: string[];
  height: number;
  highlight: boolean;
}

/** Row padding, top and bottom, by how tight the page has to be. */
export const ROW_PAD = [0.085, 0.065, 0.05] as const;

export function measureRow(row: Row, labelW: number, valueW: number, pad: number): MeasuredRow {
  const label = wrap(row.label, labelW - 0.12, CELL.size, CELL.weight);
  const valueWeight: Weight = row.highlight ? "Medium" : "Regular";
  const value = wrap(row.value, valueW, CELL_VALUE.size, valueWeight);
  return { kind: "row", label, value, height: Math.max(label.length, value.length) * lineH(CELL.size) + 2 * pad, highlight: Boolean(row.highlight) };
}

/** A gold spaced group title ("ELECTRICAL") on its own hairline. */
export function measureGroup(title: string, width: number, pad: number): MeasuredRow {
  const label = wrap(title.toUpperCase(), width, EYEBROW.size, EYEBROW.weight, EYEBROW.spacing);
  return { kind: "group", label, value: [], height: label.length * lineH(EYEBROW.size) + 2 * pad + 0.04, highlight: false };
}

export const tableHeight = (rows: MeasuredRow[]) => rows.reduce((sum, row) => sum + row.height, 0);

/** Draws label/value rows with hairlines under each; returns the bottom. */
export function drawTable(
  slide: PptxGenJS.Slide,
  rows: MeasuredRow[],
  at: { x: number; y: number; w: number; labelW: number; pad: number }
): number {
  let y = at.y;
  for (const row of rows) {
    if (row.kind === "group") {
      drawLines(slide, row.label, at.x, y + at.pad + 0.04, at.w, { ...EYEBROW, color: COLOR.gold, caps: false });
    } else {
      drawLines(slide, row.label, at.x, y + at.pad, at.labelW - 0.12, CELL);
      drawLines(slide, row.value, at.x + at.labelW, y + at.pad, at.w - at.labelW, {
        ...CELL_VALUE,
        weight: row.highlight ? "Medium" : "Regular",
        color: row.highlight ? COLOR.gold : COLOR.ink,
      });
    }
    y += row.height;
    rule(slide, at.x, y, at.w);
  }
  return y;
}

/** "23 Sep 2026" in Cairo, from parts (en-GB spells September "Sept"). */
export function longDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** "09 / 2026" — the header's issue line. */
export function monthYear(value: Date): string {
  const [year, month] = value.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }).split("-");
  return `${month} / ${year}`;
}
