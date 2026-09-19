import PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { appendProductDatasheetSlide } from "./slide";
import { appendCoverSlide } from "./sections/cover";

/**
 * Creates a fresh Presentation sized to the datasheet page layout — the one
 * place that sets up `defineLayout`/`layout`, so a caller building a
 * multi-product combined deck (bulk generation) doesn't have to duplicate
 * these dimensions from the token spec itself.
 *
 * The brand cover is added HERE, by default, rather than left to each
 * caller: the requirement is that every generated PPTX/PDF carries it, and a
 * per-call opt-in is a requirement one future entry point silently forgets.
 * Pass `cover: false` only for a deliberate cover-less export.
 */
export function createDatasheetPresentation(
  tokens: DatasheetTokens = DEFAULT_TOKENS,
  opts?: { cover?: boolean }
): PptxGenJS {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "DATASHEET", width: tokens.page.widthIn, height: tokens.page.heightIn });
  pres.layout = "DATASHEET";
  if (opts?.cover !== false) appendCoverSlide(pres, tokens);
  return pres;
}

/** Single-product convenience wrapper. Bulk generation calls appendProductDatasheetSlide directly in its own loop instead. */
export async function buildProductDatasheetPptx(
  data: DatasheetProductData,
  opts?: { tokens?: DatasheetTokens; cover?: boolean }
): Promise<Buffer> {
  const tokens = opts?.tokens ?? DEFAULT_TOKENS;
  const pres = createDatasheetPresentation(tokens, { cover: opts?.cover });

  appendProductDatasheetSlide(pres, data, { tokens });

  const out = await pres.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
