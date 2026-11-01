import type PptxGenJS from "pptxgenjs";
import { BRAND_COVER as ART } from "../assets/brand-cover";
import { FACE, PAGE, widthOf, wrap, type Weight } from "../elegant/system";

/*
 * The cover every generated document opens on — the quotation and the
 * datasheet alike — rebuilt in shapes and text from the approved
 * Quotation_Cover_Template.pptx. Positions are the template's, in points.
 * The hero, header, contacts, QR codes, partner brands and footer are fixed
 * brand content, in one of two looks (CoverContent.look); the title block and the three columns under it are
 * the document's own (CoverContent), so each document names itself.
 */

export interface CoverColumn {
  label: string;
  /** Up to four lines at most; empty values are skipped. `lead` sets a value in white Medium. */
  values: { text?: string | null; lead?: boolean }[];
}

export interface CoverContent {
  /** The gold line above the title — a quotation number, a product code. */
  eyebrow: string;
  /** Set on two lines, Light then Medium: ["Price", "Quotation"]. */
  title: [string, string];
  /** Under the title; wraps to two lines at most. */
  subtitle: string;
  /** Three columns: who / which / what. */
  columns: [CoverColumn, CoverColumn, CoverColumn];
  /** The footer's right-hand label. */
  footer: string;
  /**
   * "quotation": the drawn gold waves and a larger type scale.
   * "datasheet": the template's own photograph and type sizes.
   */
  look: "quotation" | "datasheet";
}

const pt = (v: number) => v / 72;

const INK = {
  page: "100E0C",
  white: "FFFFFF",
  gold: "C8A86E",
  soft: "CCCCCC",
  dim: "8F8A84",
  rule: "3A3632",
} as const;

interface Style {
  size: number;
  weight: Weight;
  color: string;
  /** Letter spacing in points. */
  spacing?: number;
  align?: "left" | "right" | "center";
}

/** Type sizes per look; the datasheet keeps the template's, the quotation's are a step larger. */
const SCALE = {
  quotation: { label: 8, lead: 11, value: 10, contact: 9.5, pitch: 14.5, brand: 12.5, small: 7.5, qr: 6.8 },
  datasheet: { label: 7, lead: 10, value: 9, contact: 8.5, pitch: 13.5, brand: 11, small: 6.5, qr: 5.8 },
} as const;

function styles(look: CoverContent["look"]) {
  const t = SCALE[look];
  return {
    t,
    LABEL: { size: t.label, weight: "Medium", color: INK.gold, spacing: 2.6 } as Style,
    VALUE_LEAD: { size: t.lead, weight: "Medium", color: INK.white } as Style,
    VALUE: { size: t.value, weight: "Light", color: INK.soft } as Style,
    CONTACT: { size: t.contact, weight: "Light", color: INK.soft } as Style,
  };
}
type Styles = ReturnType<typeof styles>;

/** Draws lines (already broken) at an exact line pitch in points; returns the height in inches. */
function put(slide: PptxGenJS.Slide, lines: string[], xPt: number, yPt: number, wPt: number, style: Style, pitch = style.size * 1.3): number {
  if (lines.length === 0) return 0;
  const h = pt(lines.length * pitch);
  slide.addText(lines.join("\n"), {
    margin: 0,
    x: pt(xPt),
    y: pt(yPt),
    w: pt(wPt),
    h,
    fontFace: FACE[style.weight],
    fontSize: style.size,
    color: style.color,
    charSpacing: style.spacing,
    lineSpacing: pitch,
    align: style.align ?? "left",
    valign: "top",
    wrap: true,
  });
  return h;
}

function line(slide: PptxGenJS.Slide, xPt: number, yPt: number, wPt: number, color: string) {
  slide.addShape("line", { x: pt(xPt), y: pt(yPt), w: pt(wPt), h: 0, line: { color, width: 0.5 } });
}

/** Cuts a line to `wPt`, ending it with an ellipsis. */
function clip(text: string, wPt: number, style: Style): string {
  const w = pt(wPt);
  if (widthOf(text, style.size, style.weight, style.spacing) <= w) return text;
  let s = text;
  while (s.length > 1 && widthOf(`${s}…`, style.size, style.weight, style.spacing) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/**
 * One column under PREPARED FOR / REFERENCE / SCOPE: a label, a rule, and up
 * to four lines at the template's 15pt pitch. Empty values are skipped;
 * whatever still overflows is cut on its last line.
 */
function column(slide: PptxGenJS.Slide, { label, values }: CoverColumn, xPt: number, wPt: number, { LABEL, VALUE_LEAD, VALUE }: Styles) {
  const MAX = 4;
  const PITCH = 15;
  put(slide, [label.toUpperCase()], xPt, 513.1, wPt, LABEL);
  line(slide, xPt, 527.2, wPt, INK.rule);
  let y = 535.2;
  let used = 0;
  for (const v of values) {
    const text = v.text?.trim();
    const style = v.lead ? VALUE_LEAD : VALUE;
    if (!text || used >= MAX) continue;
    let lines = wrap(text, pt(wPt), style.size, style.weight, style.spacing);
    if (lines.length > MAX - used) {
      lines = lines.slice(0, MAX - used);
      lines[lines.length - 1] = clip(`${lines[lines.length - 1]}…`, wPt, style);
    }
    put(slide, lines, xPt, y, wPt, style, PITCH);
    y += lines.length * PITCH;
    used += lines.length;
  }
}

function image(slide: PptxGenJS.Slide, art: { dataUri: string }, xPt: number, yPt: number, wPt: number, hPt: number) {
  slide.addImage({ data: art.dataUri, x: pt(xPt), y: pt(yPt), w: pt(wPt), h: pt(hPt) });
}

export function appendBrandCover(pres: PptxGenJS, content: CoverContent): void {
  const slide = pres.addSlide();
  slide.background = { color: INK.page };
  const W = PAGE.w * 72;
  const st = styles(content.look);
  const { t, LABEL, CONTACT } = st;

  // The hero, full width; its lower edge fades into the page.
  const hero = content.look === "quotation" ? ART.hero : ART.photo;
  image(slide, hero, 0, 0, W, (W * hero.height) / hero.width);

  // Header.
  image(slide, ART.logo, 42.5, 24.3, 45.6, 46);
  put(slide, ["ART LIGHTING"], 98, 31.4, 255.1, { size: t.brand, weight: "Medium", color: INK.white, spacing: 3.2 });
  put(slide, ["THE LIGHTING AS IT SHOULD BE"], 98, 50.4, 255.1, { size: t.small, weight: "Regular", color: INK.gold, spacing: 2 });
  put(slide, ["PROJECT LIGHTING SOLUTIONS"], 297.6, 34.9, 255.1, { ...LABEL, color: INK.white, align: "right" });
  put(slide, ["INDOOR · OUTDOOR · DECORATIVE"], 297.6, 49.9, 255.1, { size: t.small, weight: "Regular", color: INK.soft, spacing: 2, align: "right" });

  // Title.
  line(slide, 42.5, 352.3, 25.5, INK.gold);
  put(slide, [clip(content.eyebrow.toUpperCase(), 226.8, LABEL)], 76.5, 347.5, 226.8, LABEL);
  put(slide, [content.title[0]], 42.5, 364.3, 510.2, { size: 44, weight: "Light", color: INK.white }, 50);
  put(slide, [content.title[1]], 42.5, 412.4, 510.2, { size: 44, weight: "Medium", color: INK.white, spacing: 1 }, 50);
  const SUB: Style = { size: 10.5, weight: "Light", color: INK.soft };
  put(slide, wrap(content.subtitle, pt(510.2), SUB.size, SUB.weight).slice(0, 2), 42.5, 465.4, 510.2, SUB, 14);

  // The document's own columns.
  const [first, second, third] = content.columns;
  column(slide, first, 42.5, 164.4, st);
  column(slide, second, 229.6, 147.4, st);
  column(slide, third, 399.7, 153.1, st);

  // Contact.
  line(slide, 42.5, 600.9, 510.5, INK.gold);
  put(slide, ["ADDRESS"], 42.5, 620.8, 124.7, LABEL);
  put(slide, ["49 Saqr Quraish Buildings", "Sayed Zakaria St., Sheraton", "Cairo, Egypt"], 42.5, 636.4, 130.4, CONTACT, t.pitch);
  put(slide, ["PHONE"], 181.4, 620.8, 102, LABEL);
  put(slide, ["+20 2 2269 3008", "+20 114 899 9042", "+20 114 899 9028", "+20 110 213 1731"], 181.4, 636.4, 102, CONTACT, t.pitch);
  put(slide, ["CONTACT"], 294.8, 620.8, 147.4, LABEL);
  put(slide, ["engineering@artlighting-eg.com", "www.artlighting-eg.com"], 294.8, 636.4, 153.1, CONTACT, t.pitch);

  // QR codes, each on a white tile.
  const QR_LABEL: Style = { size: t.qr, weight: "Regular", color: INK.dim, spacing: 1.6, align: "center" };
  for (const [x, art, label] of [
    [459.2, ART.qrWebsite, "WEBSITE"],
    [510.5, ART.qrLocation, "LOCATION"],
  ] as const) {
    slide.addShape("rect", { x: pt(x), y: pt(620.8), w: pt(42.5), h: pt(42.5), fill: { color: INK.white }, line: { color: INK.white, width: 0 } });
    image(slide, art, x + 2.3, 623.1, 38, 38);
    put(slide, [label], x - 5.7, 669, 53.9, QR_LABEL);
  }

  // Tagline and partner brands.
  line(slide, 42.5, 708.7, 510.5, INK.rule);
  put(
    slide,
    ["Crafting indoor, outdoor and decorative lighting for spaces and projects.", "Where engineering meets artistry."],
    42.5,
    727.1,
    294.8,
    { ...CONTACT, color: INK.dim },
    t.pitch
  );
  image(slide, ART.balcom, 372, 709.6, 72, 72);
  image(slide, ART.misterLed, 474, 711.6, 68, 68);

  // Footer.
  line(slide, 42.5, 782.4, 510.5, INK.rule);
  put(slide, ["ARTLIGHTING-EG.COM"], 42.5, 799.4, 255.1, LABEL);
  put(slide, [content.footer.toUpperCase()], 297.6, 799.4, 255.1, { ...LABEL, weight: "Regular", color: INK.dim, align: "right" });
}
