import type { DatasheetTokens } from "./types";

const EMU_PER_INCH = 914400;

/**
 * Colors, type and page, read off the approved reference BO-017-50W.pptx
 * with a python-pptx dump. Every text run in that file inherits the theme's
 * minor font, which is Calibri — it is named explicitly here so the output
 * does not depend on whatever theme pptxgenjs writes.
 */
export const DEFAULT_TOKENS: DatasheetTokens = {
  // The reference's exact slide box. 8.27 x 11.69 lands one EMU tick away.
  page: { widthIn: 7562850 / EMU_PER_INCH, heightIn: 10688638 / EMU_PER_INCH },
  colors: {
    ink: "1A1A1A",
    label: "555555",
    body: "666666",
    eyebrow: "888888",
    gold: "C49A2E",
    bar: "F0F0F0",
    rule: "CCCCCC",
  },
  font: "Calibri",
  sizes: {
    eyebrow: 11.7,
    code: 39,
    category: 11.7,
    sectionTitle: 12,
    row: 12,
    body: 12,
    footerMark: 11.7,
    footerContact: 8.5,
    footerSite: 7.8,
    footerTagline: 6.5,
  },
};
