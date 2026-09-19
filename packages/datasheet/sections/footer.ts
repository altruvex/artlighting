import type PptxGenJS from "pptxgenjs";
import type { DatasheetTokens } from "../types";
import { letterSpace } from "./_section-title";

const CONTACT_LINE =
  "engineering@artlightingeg.com   |   www.artlighting-eg.com   |   +(02) 22693008";

/** Footer bar: hairline background, wordmark, tagline, contact line. */
export function drawFooter(slide: PptxGenJS.Slide, tokens: DatasheetTokens): void {
  const { page, layout, colors, fonts, sizes } = tokens;
  const barY = page.heightIn - layout.footerBarHeight;

  slide.addShape("rect", {
    x: 0,
    y: barY,
    w: page.widthIn,
    h: layout.footerBarHeight,
    fill: { color: colors.hairlineFill },
    line: { color: colors.hairlineFill, width: 0 },
  });

  slide.addText("ART LIGHTING", {
    x: layout.marginX,
    y: barY + 0.12,
    w: 1.6,
    h: 0.22,
    fontFace: fonts.family,
    fontSize: sizes.eyebrow,
    bold: true,
    color: colors.ink,
    align: "left",
    valign: "top",
  });

  slide.addText(letterSpace("The Lighting As It Should Be"), {
    x: layout.marginX,
    y: barY + 0.34,
    w: 3.5,
    h: 0.18,
    fontFace: fonts.family,
    fontSize: sizes.footerTiny,
    color: colors.bodyGray,
    align: "left",
    valign: "top",
  });

  slide.addText(CONTACT_LINE, {
    x: 2.4,
    y: barY + 0.05,
    w: page.widthIn - 2.4 - layout.marginX,
    h: 0.35,
    fontFace: fonts.family,
    fontSize: sizes.footerSmall,
    color: colors.bodyGray,
    align: "right",
    valign: "top",
  });

  slide.addText(letterSpace("artlighting-eg.com"), {
    x: 0,
    y: page.heightIn - 0.2,
    w: page.widthIn,
    h: 0.16,
    fontFace: fonts.family,
    fontSize: sizes.footerTiny,
    color: colors.bodyGray,
    align: "center",
    valign: "top",
  });
}
