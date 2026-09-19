export type {
  DatasheetProductData,
  DatasheetSection,
  DatasheetTokens,
  ImageRef,
  LabelValueRow,
} from "./types";
export { DEFAULT_TOKENS } from "./tokens";
export { appendProductDatasheetSlide } from "./slide";
export { buildProductDatasheetPptx, createDatasheetPresentation } from "./build";
export { appendCoverSlide } from "./sections/cover";
