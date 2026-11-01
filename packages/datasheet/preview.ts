import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { checkDatasheetLayout, drawProductDatasheet, type DatasheetLayoutReport } from "./slide";

/**
 * The live preview's input: the page as a list of the exact calls the
 * PowerPoint receives. The editor renders these, so what it shows is the
 * file's own geometry rather than a second layout that could drift from it.
 * Browser-safe: nothing here loads pptxgenjs itself.
 */
export type DatasheetPrimitive =
  | { type: "text"; text: string | PptxGenJS.TextProps[]; opts: PptxGenJS.TextPropsOptions }
  | { type: "shape"; shape: string; opts: PptxGenJS.ShapeProps }
  | { type: "image"; opts: PptxGenJS.ImageProps };

export interface DatasheetRecording {
  page: { widthIn: number; heightIn: number };
  items: DatasheetPrimitive[];
  report: DatasheetLayoutReport;
}

export function recordDatasheetPage(
  data: DatasheetProductData,
  tokens: DatasheetTokens = DEFAULT_TOKENS
): DatasheetRecording {
  const items: DatasheetPrimitive[] = [];
  const recorder = {
    background: undefined as unknown,
    addText(text: string | PptxGenJS.TextProps[], opts: PptxGenJS.TextPropsOptions) {
      items.push({ type: "text", text, opts });
      return recorder;
    },
    addShape(shape: string, opts: PptxGenJS.ShapeProps) {
      items.push({ type: "shape", shape, opts });
      return recorder;
    },
    addImage(opts: PptxGenJS.ImageProps) {
      items.push({ type: "image", opts });
      return recorder;
    },
  };
  drawProductDatasheet(recorder as unknown as PptxGenJS.Slide, data, tokens);
  return {
    page: { widthIn: tokens.page.widthIn, heightIn: tokens.page.heightIn },
    items,
    report: checkDatasheetLayout(data, tokens),
  };
}

export { checkDatasheetLayout, type DatasheetLayoutReport } from "./slide";
export { BRAND_LOGOS } from "./assets/brand-logos";
export type { DatasheetProductData, DatasheetSection, ImageRef, LabelValueRow } from "./types";
