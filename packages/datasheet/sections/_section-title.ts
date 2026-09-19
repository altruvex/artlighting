import type PptxGenJS from "pptxgenjs";
import type { DatasheetTokens } from "../types";

/** Letter-spaces text the way both reference files render section titles: "S P E C I F I C A T I O N S". */
export function letterSpace(text: string): string {
  return text.toUpperCase().split("").join(" ");
}

const TITLE_TEXT_HEIGHT = 0.17;
const RULE_THICKNESS = 0.006;

/** Vertical space a section title + its rule consumes before content begins. */
export function sectionTitleHeight(tokens: DatasheetTokens): number {
  return (
    TITLE_TEXT_HEIGHT +
    tokens.layout.sectionTitleToLineGap +
    RULE_THICKNESS +
    tokens.layout.lineToContentGap
  );
}

/**
 * Draws a gold uppercase letter-spaced section title + hairline divider.
 * Returns the y-coordinate content should start at.
 */
export function drawSectionTitle(
  slide: PptxGenJS.Slide,
  tokens: DatasheetTokens,
  opts: { x: number; y: number; width: number; title: string }
): number {
  const { x, y, width, title } = opts;
  const { layout, colors, fonts, sizes } = tokens;

  slide.addText(letterSpace(title), {
    x,
    y,
    w: width,
    h: TITLE_TEXT_HEIGHT,
    fontFace: fonts.family,
    fontSize: sizes.sectionTitle,
    color: colors.accentGold,
    align: "left",
    valign: "top",
  });

  const lineY = y + TITLE_TEXT_HEIGHT + layout.sectionTitleToLineGap;
  slide.addShape("rect", {
    x,
    y: lineY,
    w: width,
    h: RULE_THICKNESS,
    fill: { color: colors.ink },
    line: { color: colors.ink, width: 0 },
  });

  return lineY + layout.lineToContentGap;
}
