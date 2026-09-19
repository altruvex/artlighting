/**
 * Shared text metrics.
 *
 * pptxgenjs writes XML and never lays text out, so nothing can report a real
 * rendered height — yet the sheet has to flow (DESCRIPTION pushes DIMENSIONS
 * down, a long spec value grows its row). These estimates are what make that
 * possible, and they are deliberately biased to OVER-estimate: guessing tall
 * leaves a little whitespace, guessing short overlaps the next block, which
 * is the failure a reader actually notices.
 */

/** Average glyph width as a fraction of font size, tuned against real LibreOffice renders of the catalog's values. */
export const AVG_CHAR_WIDTH_FACTOR = 0.52;
export const LINE_HEIGHT_FACTOR = 1.3;

/** Line height in inches for a given point size. */
export function lineHeightIn(fontSizePt: number): number {
  return (fontSizePt * LINE_HEIGHT_FACTOR) / 72;
}

/**
 * Estimated wrapped line count. Breaks on spaces like a real renderer, so a
 * value made of a few long words is not undercounted the way a naive
 * characters/width division would.
 */
export function estimateLines(text: string, widthIn: number, fontSizePt: number): number {
  const charsPerLine = Math.max(
    1,
    Math.floor((widthIn * 72) / (fontSizePt * AVG_CHAR_WIDTH_FACTOR))
  );

  let lines = 1;
  let lineLen = 0;
  for (const word of String(text).split(/\s+/)) {
    const wordLen = word.length + 1;
    if (lineLen + wordLen > charsPerLine && lineLen > 0) {
      lines++;
      lineLen = wordLen;
    } else {
      lineLen += wordLen;
    }
  }
  return lines;
}

/** Estimated height in inches of a wrapped paragraph. */
export function estimateTextHeight(text: string, widthIn: number, fontSizePt: number): number {
  return estimateLines(text, widthIn, fontSizePt) * lineHeightIn(fontSizePt);
}

/** Estimated width in inches of a single unwrapped run. */
export function estimateTextWidthIn(text: string, fontSizePt: number): number {
  return (String(text).length * fontSizePt * AVG_CHAR_WIDTH_FACTOR) / 72;
}
