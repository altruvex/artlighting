import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "../types";
import { drawSectionTitle } from "./_section-title";
import { imagePropsFor } from "./_image";
import { estimateTextHeight } from "./_measure";

/**
 * Left column, top: the product photo, then DESCRIPTION.
 *
 * Returns the y immediately below whatever it drew, so DIMENSIONS can flow
 * after it instead of sitting at a hardcoded offset. That is what lets a
 * two-line description and a six-line one both produce a balanced page.
 */
export function drawDescription(
  slide: PptxGenJS.Slide,
  tokens: DatasheetTokens,
  data: DatasheetProductData
): number {
  const { layout, colors, fonts, sizes } = tokens;

  if (data.mainImage) {
    // `contain` preserves the product's aspect ratio inside the photo box.
    // The default stretches to fill it, which visibly distorts any product
    // that isn't the box's exact ratio — i.e. nearly all of them.
    slide.addImage({
      ...layout.photo,
      sizing: { type: "contain", w: layout.photo.w, h: layout.photo.h },
      ...imagePropsFor(data.mainImage),
    });
  }

  const photoBottom = layout.photo.y + layout.photo.h;
  const text = data.descriptionText.trim();

  // No text means no section: drawing the heading and its rule with nothing
  // under them reads as a rendering failure, not as an empty field.
  if (!text) return photoBottom + layout.blockGap;

  const titleY = photoBottom + layout.blockGap;
  const textY = drawSectionTitle(slide, tokens, {
    x: layout.leftColX,
    y: titleY,
    width: layout.leftColWidth,
    title: "Description",
  });

  const textH = estimateTextHeight(text, layout.leftColWidth, sizes.value);

  slide.addText(text, {
    x: layout.leftColX,
    y: textY,
    w: layout.leftColWidth,
    h: textH,
    fontFace: fonts.family,
    fontSize: sizes.value,
    color: colors.bodyGray,
    align: "left",
    valign: "top",
    wrap: true,
  });

  return textY + textH + layout.blockGap;
}
