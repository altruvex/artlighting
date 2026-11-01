import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { checkTechnicalLayout, drawTechnicalDatasheet } from "./technical";

export interface DatasheetLayoutReport {
  /** The tables and drawings run past the footer even at the tightest spacing. */
  specsOverflow: boolean;
  /** The description is what pushes the page over. */
  descriptionTooLong: boolean;
}

/**
 * Whether a page will lay out cleanly, answered with the same plan the
 * drawing uses. The editor shows it live and the export refuses a page that
 * fails it, so a sheet never ships with rows running into the footer.
 */
export function checkDatasheetLayout(
  data: DatasheetProductData,
  _tokens: DatasheetTokens = DEFAULT_TOKENS
): DatasheetLayoutReport {
  return checkTechnicalLayout(data);
}

/**
 * Draws one product page onto a slide. The slide can be a real pptxgenjs
 * slide or the recorder behind the live preview (preview.ts) — one drawing
 * routine, so the preview cannot disagree with the file.
 */
export function drawProductDatasheet(
  slide: PptxGenJS.Slide,
  data: DatasheetProductData,
  _tokens: DatasheetTokens = DEFAULT_TOKENS
): void {
  drawTechnicalDatasheet(slide, data);
}

/**
 * Appends ONE product page onto an existing Presentation — the seam shared by
 * the single-product download and the bulk combined deck, so both draw a
 * product identically.
 */
export function appendProductDatasheetSlide(
  pres: PptxGenJS,
  data: DatasheetProductData,
  opts?: { tokens?: DatasheetTokens }
): void {
  drawProductDatasheet(pres.addSlide(), data, opts?.tokens ?? DEFAULT_TOKENS);
}
