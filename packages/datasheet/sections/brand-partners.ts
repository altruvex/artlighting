import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "../types";
import { drawSectionTitle, sectionTitleHeight } from "./_section-title";
import { imagePropsFor } from "./_image";

const LOGO_HEIGHT = 0.62;
const LOGO_WIDTH = 1.5;
const LOGO_GAP = 0.2;

/** Height this block will occupy, or 0 when the product has no logos. */
export function measureBrandPartners(
  tokens: DatasheetTokens,
  data: DatasheetProductData
): number {
  if ((data.brandLogos ?? []).length === 0) return 0;
  return sectionTitleHeight(tokens) + LOGO_HEIGHT + tokens.layout.sectionGap;
}

/**
 * Right column, last: BRAND & PARTNERS — the manufacturer's mark.
 *
 * Skipped when the product has no logo, so a sheet never shows an empty
 * heading. Logos are placed with `contain` because the marks are wordmarks
 * of very different aspect ratios and stretching one misrepresents a brand.
 */
export function drawBrandPartners(
  slide: PptxGenJS.Slide,
  tokens: DatasheetTokens,
  data: DatasheetProductData,
  y: number
): number {
  const logos = data.brandLogos ?? [];
  if (logos.length === 0) return y;

  const { layout, page } = tokens;

  // Never let the block collide with the footer bar.
  const bottomLimit = page.heightIn - layout.footerBarHeight - layout.blockGap;
  if (y + sectionTitleHeight(tokens) + LOGO_HEIGHT > bottomLimit) return y;

  const contentY = drawSectionTitle(slide, tokens, {
    x: layout.rightColX,
    y,
    width: layout.rightColWidth,
    title: "Brand & Partners",
  });

  logos.forEach((logo, i) => {
    slide.addImage({
      x: layout.rightColX + i * (LOGO_WIDTH + LOGO_GAP),
      y: contentY,
      w: LOGO_WIDTH,
      h: LOGO_HEIGHT,
      sizing: { type: "contain", w: LOGO_WIDTH, h: LOGO_HEIGHT },
      ...imagePropsFor(logo),
    });
  });

  return contentY + LOGO_HEIGHT + layout.sectionGap;
}
