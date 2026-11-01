export type {
  DatasheetProductData,
  DatasheetSection,
  DatasheetTokens,
  ImageRef,
  LabelValueRow,
} from "./types";
export { DEFAULT_TOKENS } from "./tokens";
export { appendProductDatasheetSlide } from "./slide";
export { buildProductDatasheetPptx, createDatasheetPresentation, type DatasheetCover } from "./build";
export { appendBrandCover, type CoverContent } from "./sections/brand-cover";
export { buildQuotationPptx, type QuotationDocumentData } from "./quotation";
export { checkDatasheetLayout, drawProductDatasheet, type DatasheetLayoutReport } from "./slide";
export { BRAND_LOGOS } from "./assets/brand-logos";
