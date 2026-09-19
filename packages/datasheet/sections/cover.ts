import type PptxGenJS from "pptxgenjs";
import type { DatasheetTokens } from "../types";
import { COVER_IMAGE_DATA_URI } from "../assets/cover-image";

/**
 * Appends the brand cover as a full-bleed slide. It is a pre-rendered image
 * of the approved `cover-new-collection_fixed.pptx` rather than a rebuild in
 * shapes and text boxes: the cover is a fixed brand asset (nothing on it is
 * per-product), and a rebuild would drop the ink artwork and photographic
 * collage the original is made of. The product pages that follow stay fully
 * editable — only the cover is flat.
 */
export function appendCoverSlide(pres: PptxGenJS, tokens: DatasheetTokens): void {
  const slide = pres.addSlide();
  slide.addImage({
    data: COVER_IMAGE_DATA_URI,
    x: 0,
    y: 0,
    w: tokens.page.widthIn,
    h: tokens.page.heightIn,
  });
}
