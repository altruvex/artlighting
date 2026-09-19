import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { drawHeader } from "./sections/header";
import { drawDescription } from "./sections/description";
import { drawDimensions } from "./sections/dimensions";
import { drawRowSection, measureRowSection } from "./sections/_row-section";
import { drawBrandPartners, measureBrandPartners } from "./sections/brand-partners";
import { drawFooter } from "./sections/footer";

/** Never compress the right column past this — below it the sheet stops being readable. */
const MIN_FIT_SCALE = 0.72;

/**
 * Shrinks the right column's vertical rhythm just enough to fit its sections.
 *
 * A luminaire has three sections; a pole (BO-014-100W) has five — BASE, ARM
 * and LUMINAIRE blocks on top of the usual ones — and at full spacing those
 * run off the page. Rather than truncate content or let it collide with the
 * footer, the row height and inter-section gap scale down together, with the
 * type shrinking far more gently so the sheet still reads as the same
 * document. Returns the original tokens when everything already fits, so the
 * common case is untouched.
 */
function fitRightColumn(
  tokens: DatasheetTokens,
  data: DatasheetProductData,
  available: number
): DatasheetTokens {
  const measure = (t: DatasheetTokens) =>
    data.sections.reduce(
      (sum, s) => sum + measureRowSection(t, { rows: s.rows, width: t.layout.rightColWidth }),
      0
    ) + measureBrandPartners(t, data);

  const needed = measure(tokens);
  if (needed <= available || needed <= 0) return tokens;

  const scale = Math.max(MIN_FIT_SCALE, available / needed);

  return {
    ...tokens,
    sizes: {
      ...tokens.sizes,
      // Type shrinks at a quarter of the layout's rate: losing whitespace is
      // invisible, losing legibility is not.
      label: tokens.sizes.label * (1 - (1 - scale) * 0.25),
      value: tokens.sizes.value * (1 - (1 - scale) * 0.25),
    },
    layout: {
      ...tokens.layout,
      rowHeight: tokens.layout.rowHeight * scale,
      sectionGap: tokens.layout.sectionGap * scale,
      lineToContentGap: tokens.layout.lineToContentGap * scale,
    },
  };
}

/**
 * Appends ONE product datasheet slide onto an existing Presentation. This is
 * the seam that lets "one file per product" (buildProductDatasheetPptx) and
 * "one combined multi-slide file grouped by category" (bulk generation)
 * reuse identical per-product slide-drawing code — the bulk path just calls
 * this in a loop against one shared Presentation instead of a separate
 * implementation.
 *
 * Both columns FLOW rather than sit at fixed offsets, so the same template
 * absorbs a product with one drawing and three spec blocks or four drawings
 * and six, without a per-family template.
 */
export function appendProductDatasheetSlide(
  pres: PptxGenJS,
  data: DatasheetProductData,
  opts?: { tokens?: DatasheetTokens }
): void {
  const tokens = opts?.tokens ?? DEFAULT_TOKENS;
  const slide = pres.addSlide();

  drawHeader(slide, tokens, data);

  // Left column: photo -> description -> dimension drawings, each starting
  // where the previous one ended.
  const afterDescription = drawDescription(slide, tokens, data);
  drawDimensions(slide, tokens, data, afterDescription);

  // Right column: sections top to bottom, auto-fitted as a group.
  const columnTop = tokens.layout.headerBarHeight + 0.215;
  const columnBottom = tokens.page.heightIn - tokens.layout.footerBarHeight - tokens.layout.blockGap;
  const fitted = fitRightColumn(tokens, data, columnBottom - columnTop);

  let y = columnTop;
  for (const section of data.sections) {
    y = drawRowSection(slide, fitted, {
      x: fitted.layout.rightColX,
      y,
      width: fitted.layout.rightColWidth,
      title: section.title,
      rows: section.rows,
    });
  }
  drawBrandPartners(slide, fitted, data, y);

  drawFooter(slide, tokens);
}
