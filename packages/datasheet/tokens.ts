import type { DatasheetTokens } from "./types";

/**
 * Extracted from the two reference files Ali provided
 * (cover-new-collection_fixed.pptx, BO-011-50W.pptx) via a python-pptx dump.
 * BO-011-50W.pptx is the layout being replicated; its gold (#C49A2E) is used
 * as the single accent rather than the cover's close-but-different #C8A86E.
 */
export const DEFAULT_TOKENS: DatasheetTokens = {
  page: { widthIn: 8.27, heightIn: 11.69 },
  colors: {
    ink: "1A1A1A",
    labelGray: "555555",
    bodyGray: "666666",
    eyebrowGray: "888888",
    accentGold: "C49A2E",
    hairlineFill: "F0F0F0",
    dottedLeader: "CCCCCC",
    white: "FFFFFF",
  },
  fonts: {
    family: "Trebuchet MS",
  },
  sizes: {
    eyebrow: 11,
    code: 32,
    sectionTitle: 12,
    label: 11,
    value: 11,
    footerSmall: 8.5,
    footerTiny: 6.5,
  },
  layout: {
    marginX: 0.2,
    headerBarHeight: 0.642,
    footerBarHeight: 0.6,
    leftColX: 0.2,
    leftColWidth: 3.785,
    rightColX: 4.185,
    rightColWidth: 3.855,
    labelColWidth: 2.12,
    rowHeight: 0.225,
    sectionTitleToLineGap: 0.044,
    lineToContentGap: 0.08,
    sectionGap: 0.3,
    photo: { x: 0.2, y: 1.6, w: 3.785, h: 4.09 },
    blockGap: 0.12,
  },
};
