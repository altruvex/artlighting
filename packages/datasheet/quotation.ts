import PptxGenJS from "pptxgenjs";
import type { DatasheetTokens, ImageRef } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { placeImage } from "./sections/_image";
import { appendBrandCover, type CoverContent } from "./sections/brand-cover";
import {
  CELL,
  CELL_VALUE,
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
  fitSize,
  lineH,
  longDate,
  measureGroup,
  measureRow,
  rule,
  tableHeight,
  widthOf,
  wrap,
  type MeasuredRow,
  type TextStyle,
} from "./elegant/system";

/**
 * A priced offer as the customer reads it. Flat and already decided: every
 * figure arrives computed (the caller runs @repo/pricing), so this module
 * lays out and never does arithmetic that could disagree with the editor.
 * Money is a decimal string ("1250.00"); rates are fractions ("0.1400").
 */
export interface QuotationDocumentData {
  number: string;
  issueDate: Date;
  validUntil: Date;
  currency: string;
  subject?: string | null;
  preparedBy?: string | null;
  customer: {
    name: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
  };
  lines: {
    sku: string;
    name: string;
    description?: string | null;
    image?: ImageRef;
    quantity: number;
    unitPrice: string;
    discountRate: string;
    lineTotal: string;
  }[];
  totals: {
    subtotal: string;
    discountTotal: string;
    /** The whole-quotation discount rate when it was a percentage, for the label. */
    discountRate?: string | null;
    taxRate: string;
    taxTotal: string;
    grandTotal: string;
  };
  terms?: string | null;
}


/*
 * The quotation on the document design system (elegant/system.ts), the
 * datasheet's twin: the same header, numbered sections and footer strip.
 * The number is the title and the grand total is the headline beside it;
 * 01 is who and when, 02 the items — closed by the terms beside the totals,
 * and the two signature lines.
 */

const COL = {
  no: { x: MARGIN, w: 0.26 },
  image: { x: MARGIN + 0.3, w: 0.42 },
  item: { x: MARGIN + 0.84, w: 2.6 },
  qty: { x: MARGIN + 3.46, w: 0.46 },
  unit: { x: MARGIN + 3.96, w: 1.22 },
  disc: { x: MARGIN + 5.22, w: 0.52 },
  total: { x: MARGIN + 5.78, w: RIGHT_EDGE - (MARGIN + 5.78) },
} as const;

/**
 * Item row density. The roomy one is the default; the tight one (smaller
 * thumbnail, less padding) is used only when it saves a page.
 */
interface Density {
  pad: number;
  thumb: number;
}
const DENSITY: readonly Density[] = [
  { pad: 0.07, thumb: 0.42 },
  { pad: 0.045, thumb: 0.34 },
];
const GAP = 0.28;
const HEAD_ROW_H = 0.3;
const NAME: TextStyle = { size: 9.5, weight: "Medium" };
const SKU: TextStyle = { size: 8, weight: "Regular", color: COLOR.gold, spacing: 0.5 };
const DESC: TextStyle = { size: 8.5, weight: "Light", color: COLOR.muted };
const DESC_MAX_LINES = 3;
const TOTALS_X = MARGIN + 3.95;
const TOTALS_W = RIGHT_EDGE - TOTALS_X;
const TITLE_MAX = 30;
const SUBJECT = 10.5;
const HEADLINE_SUB = 7.5;

function money(value: string, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value as unknown as number).replace(/\u00A0/g, " ");
}

function percent(rate: string): string {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(Number(rate));
}

/** Many catalog names are the SKU itself; printing it twice reads as a glitch. */
function showSku(line: { sku: string; name: string }): boolean {
  return Boolean(line.sku) && line.sku.trim().toLowerCase() !== line.name.trim().toLowerCase();
}

/** Lines of a description, cut to `max` with an ellipsis on the last word that fits. */
function clamp(text: string, width: number, style: TextStyle, max: number): string[] {
  const lines = wrap(text, width, style.size, style.weight);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1]!;
  while (last.includes(" ") && widthOf(`${last}…`, style.size, style.weight) > width) last = last.slice(0, last.lastIndexOf(" "));
  kept[max - 1] = `${last}…`;
  return kept;
}

interface ItemPlan {
  index: number;
  name: string[];
  sku: string | null;
  desc: string[];
  height: number;
}

function planItem(line: QuotationDocumentData["lines"][number], index: number, density: Density): ItemPlan {
  const name = wrap(line.name, COL.item.w, NAME.size, NAME.weight).slice(0, 3);
  const sku = showSku(line) ? line.sku.toUpperCase() : null;
  const desc = line.description?.trim() ? clamp(line.description.trim(), COL.item.w, DESC, DESC_MAX_LINES) : [];
  const text = name.length * lineH(NAME.size) + (sku ? lineH(SKU.size) : 0) + desc.length * lineH(DESC.size);
  return { index, name, sku, desc, height: Math.max(density.thumb, text) + 2 * density.pad };
}

/** 01 — who the offer is for, and its dates: two small tables side by side. */
function detailColumns(data: QuotationDocumentData): [MeasuredRow[], MeasuredRow[]] {
  const colW = (CONTENT_W - 0.35) / 2;
  const labelW = 1.15;
  const c = data.customer;
  const bill = [
    ["Company", c.companyName],
    ["Contact", c.name],
    ["Phone", c.phone],
    ["Email", c.email],
    ["Address", c.address],
    ["Tax ID", c.taxId],
  ].filter((r): r is [string, string] => Boolean(r[1]?.trim()));
  const offer = [
    ["Date", longDate(data.issueDate)],
    ["Valid until", longDate(data.validUntil)],
    ["Currency", data.currency],
    ["Prepared by", data.preparedBy ?? ""],
  ].filter((r) => r[1]!.trim()) as [string, string][];
  const rows = (items: [string, string][]) => items.map(([label, value]) => measureRow({ label, value }, labelW, colW - labelW, ROW_PAD[2]));
  return [
    [measureGroup("Bill to", colW, ROW_PAD[2]), ...rows(bill)],
    [measureGroup("Quotation", colW, ROW_PAD[2]), ...rows(offer)],
  ];
}

interface Opening {
  titleSize: number;
  titleW: number;
  subject: string[];
  headlineW: number;
  detailsY: number;
  columns: [MeasuredRow[], MeasuredRow[]];
  itemsY: number;
}

function planOpening(data: QuotationDocumentData): Opening {
  const total = money(data.totals.grandTotal, data.currency);
  const headlineW = widthOf(total, TITLE_MAX - 4, "Light") + 0.04;
  const titleW = CONTENT_W - headlineW - 0.3;
  const titleSize = fitSize(data.number, titleW, TITLE_MAX, 18);
  const subject = data.subject?.trim() ? wrap(data.subject.trim(), titleW, SUBJECT, "Light") : [];
  const opening = Math.max(1.46 + lineH(titleSize) + 0.1 + subject.length * lineH(SUBJECT), 1.6 + lineH(TITLE_MAX - 4) + lineH(HEADLINE_SUB));
  const detailsY = opening + GAP;
  const columns = detailColumns(data);
  const itemsY = detailsY + SECTION_HEAD_H + 0.02 + Math.max(tableHeight(columns[0]), tableHeight(columns[1])) + GAP;
  return { titleSize, titleW, subject, headlineW, detailsY, columns, itemsY };
}

/** Label, amount, and the colour the amount is set in — a discount reads as money taken off. */
function totalsRows(data: QuotationDocumentData): [string, string, string][] {
  const { totals, currency } = data;
  const rows: [string, string, string][] = [["Subtotal", money(totals.subtotal, currency), COLOR.ink]];
  if (Number(totals.discountTotal) > 0) {
    rows.push([
      totals.discountRate ? `Discount (${percent(totals.discountRate)})` : "Discount",
      `− ${money(totals.discountTotal, currency)}`,
      COLOR.destructive,
    ]);
  }
  if (Number(totals.taxRate) > 0) rows.push([`VAT (${percent(totals.taxRate)})`, money(totals.taxTotal, currency), COLOR.ink]);
  return rows;
}

const TERMS: TextStyle = { size: 8.5, weight: "Light", color: COLOR.ink };
const SIGN_H = 0.55;
const TERMS_W = TOTALS_X - MARGIN - 0.4;

function totalsHeight(data: QuotationDocumentData): number {
  return totalsRows(data).length * (lineH(CELL.size) + 2 * ROW_PAD[2]) + 0.14 + lineH(18) + 0.1;
}

function termsLines(data: QuotationDocumentData): string[] {
  const terms = data.terms?.trim();
  return terms ? wrap(terms, TERMS_W, TERMS.size, TERMS.weight) : [];
}

/** The terms beside the totals, then the signatures under both. */
function closingHeight(data: QuotationDocumentData): number {
  const terms = termsLines(data);
  const termsH = terms.length ? 0.2 + lineH(EYEBROW.size) + 0.1 + terms.length * lineH(TERMS.size) : 0;
  return Math.max(0.12 + totalsHeight(data), termsH) + 0.28 + SIGN_H;
}

function drawItemsHead(slide: PptxGenJS.Slide, y: number): number {
  const head = (text: string, col: { x: number; w: number }, align: "left" | "right") =>
    drawLines(slide, [text], col.x, y + (HEAD_ROW_H - lineH(EYEBROW.size)) / 2, col.w, { ...EYEBROW, color: COLOR.gold, align, caps: false });
  head("#", COL.no, "left");
  head("ITEM", { x: COL.image.x, w: COL.item.x + COL.item.w - COL.image.x }, "left");
  head("QTY", COL.qty, "right");
  head("UNIT PRICE", COL.unit, "right");
  head("DISC.", COL.disc, "right");
  head("AMOUNT", COL.total, "right");
  rule(slide, MARGIN, y + HEAD_ROW_H, CONTENT_W);
  return y + HEAD_ROW_H;
}

function drawItem(slide: PptxGenJS.Slide, data: QuotationDocumentData, item: ItemPlan, y: number, density: Density): void {
  const line = data.lines[item.index]!;
  const top = y + density.pad;
  const cell = (text: string, col: { x: number; w: number }, style: TextStyle = CELL_VALUE) =>
    drawLines(slide, [text], col.x, top, col.w, { ...style, align: "right" });

  drawLines(slide, [String(item.index + 1).padStart(2, "0")], COL.no.x, top, COL.no.w, { ...CELL, size: 8.5 });
  const thumb = { x: COL.image.x, y: top, w: density.thumb, h: density.thumb };
  if (line.image) placeImage(slide, line.image, thumb);
  else slide.addShape("rect", { ...thumb, fill: { color: COLOR.wash }, line: { color: COLOR.wash, width: 0 } });

  let ty = top;
  ty += drawLines(slide, item.name, COL.item.x, ty, COL.item.w, NAME);
  if (item.sku) ty += drawLines(slide, [item.sku], COL.item.x, ty, COL.item.w, SKU);
  if (item.desc.length) drawLines(slide, item.desc, COL.item.x, ty, COL.item.w, DESC);

  cell(String(line.quantity), COL.qty);
  cell(money(line.unitPrice, data.currency), COL.unit);
  cell(Number(line.discountRate) > 0 ? percent(line.discountRate) : "—", COL.disc, Number(line.discountRate) > 0 ? CELL_VALUE : CELL);
  cell(money(line.lineTotal, data.currency), COL.total, { ...CELL_VALUE, weight: "Medium" });
  rule(slide, MARGIN, y + item.height, CONTENT_W);
}

function drawClosing(slide: PptxGenJS.Slide, data: QuotationDocumentData, top: number): void {
  // Totals, right-aligned under the amounts.
  let y = top + 0.12;
  for (const [label, value, color] of totalsRows(data)) {
    drawLines(slide, [label], TOTALS_X, y + ROW_PAD[2], 1.6, CELL);
    drawLines(slide, [value], TOTALS_X + 1.2, y + ROW_PAD[2], TOTALS_W - 1.2, { ...CELL_VALUE, color, align: "right" });
    y += lineH(CELL.size) + 2 * ROW_PAD[2];
    rule(slide, TOTALS_X, y, TOTALS_W);
  }
  y += 0.14;
  drawLines(slide, ["TOTAL"], TOTALS_X, y + (lineH(18) - lineH(8.5)) / 2, 1.2, { ...EYEBROW, size: 8.5, spacing: 2.8, color: COLOR.gold, caps: false });
  // The figure the customer signs for, in the brand's primary.
  drawLines(slide, [money(data.totals.grandTotal, data.currency)], TOTALS_X + 1.0, y, TOTALS_W - 1.0, { size: 18, weight: "Regular", color: COLOR.gold, align: "right" });
  y += lineH(18) + 0.1;
  rule(slide, TOTALS_X, y, TOTALS_W, COLOR.ink, 0.75);

  // Terms on the left, level with the totals.
  const terms = termsLines(data);
  let termsBottom = top;
  if (terms.length) {
    drawLines(slide, ["TERMS & CONDITIONS"], MARGIN, top + 0.2, TERMS_W, { ...EYEBROW, color: COLOR.gold, caps: false });
    termsBottom = top + 0.2 + lineH(EYEBROW.size) + 0.1;
    termsBottom += drawLines(slide, terms, MARGIN, termsBottom, TERMS_W, TERMS);
  }

  // Acceptance: the line a customer signs is what turns an offer into an order.
  const signY = Math.max(y, termsBottom) + 0.28;
  const half = (CONTENT_W - 0.4) / 2;
  const boxes: [string, number][] = [
    ["For Art Lighting", MARGIN],
    ["Customer acceptance — signature & date", MARGIN + half + 0.4],
  ];
  for (const [label, x] of boxes) {
    drawLines(slide, [label.toUpperCase()], x, signY, half, { ...EYEBROW, color: COLOR.muted, caps: false });
    rule(slide, x, signY + SIGN_H - 0.05, half, COLOR.ink, 0.5);
  }
}

/**
 * Lays the items out first, so the page count is known before any page is
 * drawn ("PAGE 1 / 3"), then draws. The closing block (totals, terms,
 * signatures) always stays in one piece: if it does not fit under the last
 * item it opens a page of its own.
 */
/** The cover's per-quotation text: who it is for, its reference, and its scope. */
function quotationCover(data: QuotationDocumentData): CoverContent {
  const client = data.customer.companyName?.trim() || data.customer.name;
  const subject = data.subject?.trim();
  const items = data.lines.length;
  const units = data.lines.reduce((sum, l) => sum + l.quantity, 0);
  return {
    eyebrow: data.number,
    title: ["Price", "Quotation"],
    subtitle: [subject, `Prepared for ${client}`].filter(Boolean).join("  ·  "),
    columns: [
      {
        label: "Prepared for",
        values: [
          { text: client, lead: true },
          { text: data.customer.companyName?.trim() ? data.customer.name : null },
          { text: data.customer.phone || data.customer.email },
          { text: data.customer.address },
        ],
      },
      {
        label: "Reference",
        values: [
          { text: data.number, lead: true },
          { text: `Issued ${longDate(data.issueDate)}` },
          { text: `Valid until ${longDate(data.validUntil)}` },
        ],
      },
      {
        label: "Scope",
        values: [
          { text: subject, lead: true },
          { text: `${items} ${items === 1 ? "item" : "items"} · ${units} ${units === 1 ? "unit" : "units"}`, lead: !subject },
          { text: `Prices in ${data.currency}${Number(data.totals.taxRate) > 0 ? ", incl. VAT" : ""}` },
        ],
      },
    ],
    footer: "Private & confidential",
    look: "quotation",
  };
}

export async function buildQuotationPptx(data: QuotationDocumentData, opts?: { tokens?: DatasheetTokens }): Promise<Buffer> {
  const tokens = opts?.tokens ?? DEFAULT_TOKENS;
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "A4P", width: tokens.page.widthIn, height: tokens.page.heightIn });
  pres.layout = "A4P";
  pres.title = `Quotation ${data.number}`;
  pres.company = "Art Lighting";
  appendBrandCover(pres, quotationCover(data));

  const opening = planOpening(data);
  const closing = closingHeight(data);
  const CONTINUED_TOP = 1.3;

  type Page = { items: { plan: ItemPlan; y: number }[]; headY: number; closingY: number | null };
  const paginate = (density: Density): Page[] => {
    const items = data.lines.map((line, i) => planItem(line, i, density));
    const pages: Page[] = [];
    let page: Page = { items: [], headY: opening.itemsY, closingY: null };
    let y = page.headY + SECTION_HEAD_H + 0.02 + HEAD_ROW_H;
    for (const item of items) {
      if (y + item.height > FLOOR && page.items.length > 0) {
        pages.push(page);
        page = { items: [], headY: CONTINUED_TOP, closingY: null };
        y = page.headY + SECTION_HEAD_H + 0.02 + HEAD_ROW_H;
      }
      page.items.push({ plan: item, y });
      y += item.height;
    }
    if (items.length === 0) y += 0.5;
    if (y + closing > FLOOR) {
      pages.push(page);
      page = { items: [], headY: CONTINUED_TOP, closingY: CONTINUED_TOP - 0.12 };
    } else {
      page.closingY = y;
    }
    pages.push(page);
    return pages;
  };
  const [roomy, tight] = DENSITY as [Density, Density];
  const roomyPages = paginate(roomy);
  const tightPages = paginate(tight);
  const density = tightPages.length < roomyPages.length ? tight : roomy;
  const pages = density === tight ? tightPages : roomyPages;
  const noItems = data.lines.length === 0;

  pages.forEach((p, i) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    drawPageHeader(slide, "Quotation", `${data.number} · ${longDate(data.issueDate)}`);

    if (i === 0) {
      drawLines(slide, ["PRICE QUOTATION"], MARGIN, 1.3, opening.titleW, { ...EYEBROW, color: COLOR.gold, caps: false });
      drawLines(slide, [data.number], MARGIN, 1.46, opening.titleW, { size: opening.titleSize, weight: "Light" });
      if (opening.subject.length) {
        drawLines(slide, opening.subject, MARGIN, 1.46 + lineH(opening.titleSize) + 0.1, opening.titleW, { size: SUBJECT, weight: "Light" });
      }
      const hx = RIGHT_EDGE - opening.headlineW;
      drawLines(slide, [money(data.totals.grandTotal, data.currency)], hx, 1.6, opening.headlineW, { size: TITLE_MAX - 4, weight: "Light", align: "right" });
      const sub = Number(data.totals.taxRate) > 0 ? `Total incl. VAT ${percent(data.totals.taxRate)}` : "Total";
      drawLines(slide, [sub.toUpperCase()], hx - 1, 1.6 + lineH(TITLE_MAX - 4), opening.headlineW + 1, { size: HEADLINE_SUB, weight: "Regular", spacing: 2.6, color: COLOR.muted, align: "right" });

      drawSectionHead(slide, 1, "Details", opening.detailsY);
      const colW = (CONTENT_W - 0.35) / 2;
      opening.columns.forEach((rows, c) => drawTable(slide, rows, { x: MARGIN + c * (colW + 0.35), y: opening.detailsY + SECTION_HEAD_H + 0.02, w: colW, labelW: 1.15, pad: ROW_PAD[2] }));
    }

    const itemsSection = 2;
    if (p.items.length > 0 || (i === 0 && noItems)) {
      drawSectionHead(slide, itemsSection, i === 0 ? "Items" : "Items — continued", p.headY);
      drawItemsHead(slide, p.headY + SECTION_HEAD_H + 0.02);
      if (noItems) drawLines(slide, ["No items"], MARGIN, p.headY + SECTION_HEAD_H + 0.02 + HEAD_ROW_H + 0.15, CONTENT_W, { ...CELL, align: "center" });
    }
    for (const row of p.items) drawItem(slide, data, row.plan, row.y, density);
    if (p.closingY !== null) drawClosing(slide, data, p.closingY);

    drawPageFooter(slide, i + 1, pages.length);
  });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}
