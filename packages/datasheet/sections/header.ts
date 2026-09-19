import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "../types";
import { letterSpace } from "./_section-title";

/** Header bar: hairline background, "LIGHTING COLLECTION" eyebrow, product code, category subtitle. */
export function drawHeader(slide: PptxGenJS.Slide, tokens: DatasheetTokens, data: DatasheetProductData): void {
  const { page, layout, colors, fonts, sizes } = tokens;

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: page.widthIn,
    h: layout.headerBarHeight,
    fill: { color: colors.hairlineFill },
    line: { color: colors.hairlineFill, width: 0 },
  });

  slide.addText(letterSpace("Lighting Collection"), {
    x: 0,
    y: 0.215,
    w: page.widthIn,
    h: 0.22,
    fontFace: fonts.family,
    fontSize: sizes.eyebrow,
    color: colors.eyebrowGray,
    align: "center",
    valign: "middle",
  });

  slide.addText(data.productCode, {
    x: layout.marginX,
    y: 0.86,
    w: layout.leftColWidth,
    h: 0.42,
    fontFace: fonts.family,
    fontSize: sizes.code,
    bold: true,
    color: colors.ink,
    align: "left",
    valign: "top",
  });

  slide.addText(letterSpace(data.categoryLabel), {
    x: layout.marginX,
    y: 1.32,
    w: layout.leftColWidth,
    h: 0.18,
    fontFace: fonts.family,
    fontSize: sizes.label,
    color: colors.accentGold,
    align: "left",
    valign: "top",
  });

  slide.addShape("rect", {
    x: layout.marginX,
    y: 1.526,
    w: 1.91,
    h: 0.006,
    fill: { color: colors.accentGold },
    line: { color: colors.accentGold, width: 0 },
  });
}
