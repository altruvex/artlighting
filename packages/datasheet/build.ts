import PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens } from "./types";
import { DEFAULT_TOKENS } from "./tokens";
import { appendProductDatasheetSlide } from "./slide";
import { appendBrandCover, type CoverContent } from "./sections/brand-cover";
import { longDate } from "./elegant/system";

/**
 * What the datasheet cover names: one product, or a collection (the bulk
 * export's one-deck-per-category file) with its products.
 */
export type DatasheetCover = { products: DatasheetProductData[]; collection?: string } | false;

/**
 * Creates a fresh Presentation sized to the datasheet page layout — the one
 * place that sets up `defineLayout`/`layout`, so a caller building a
 * multi-product combined deck (bulk generation) doesn't have to duplicate
 * these dimensions from the token spec itself.
 *
 * The brand cover is added HERE rather than left to each caller, and the
 * argument is required: every generated PPTX/PDF opens on it, and the cover
 * names what follows, so a caller has to say what that is. Pass `false`
 * only for a deliberate cover-less export.
 */
export function createDatasheetPresentation(cover: DatasheetCover, tokens: DatasheetTokens = DEFAULT_TOKENS): PptxGenJS {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "DATASHEET", width: tokens.page.widthIn, height: tokens.page.heightIn });
  pres.layout = "DATASHEET";
  if (cover !== false) appendBrandCover(pres, datasheetCover(cover.products, cover.collection));
  return pres;
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
}

/** The cover's per-document text, from the products the deck holds. */
function datasheetCover(products: DatasheetProductData[], collection?: string): CoverContent {
  const issued = new Date();
  const edition = `Edition ${issued.getFullYear()}`;
  const brands = unique(products.map((p) => p.brandName)).join(", ");
  const single = !collection && products.length === 1 ? products[0] : undefined;

  if (single) {
    const contents = [
      single.sections.some((s) => s.rows.length > 0) ? "Specifications" : null,
      single.dimensionDiagrams?.length ? "Dimensions" : null,
    ].filter((v): v is string => Boolean(v));
    return {
      eyebrow: single.productCode,
      title: ["Technical", "Datasheet"],
      subtitle: unique([single.categoryLabel, single.brandName]).join("  ·  "),
      columns: [
        { label: "Product", values: [{ text: single.productCode, lead: true }, { text: single.categoryLabel }, { text: single.brandName }] },
        { label: "Reference", values: [{ text: "Technical datasheet", lead: true }, { text: `Issued ${longDate(issued)}` }, { text: edition }] },
        { label: "Contents", values: contents.map((text, i) => ({ text, lead: i === 0 })) },
      ],
      footer: `Lighting collection ${issued.getFullYear()}`,
      look: "datasheet",
    };
  }

  const count = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  const name = collection?.trim() || "Lighting collection";
  return {
    eyebrow: name,
    title: ["Technical", "Datasheets"],
    subtitle: [name, count].join("  ·  "),
    columns: [
      { label: "Collection", values: [{ text: name, lead: true }, { text: count }, { text: brands }] },
      { label: "Reference", values: [{ text: "Technical datasheets", lead: true }, { text: `Issued ${longDate(issued)}` }, { text: edition }] },
      { label: "Contents", values: [{ text: products.map((p) => p.productCode).join(", ") }] },
    ],
    footer: `Lighting collection ${issued.getFullYear()}`,
    look: "datasheet",
  };
}

/** Single-product convenience wrapper. Bulk generation calls appendProductDatasheetSlide directly in its own loop instead. */
export async function buildProductDatasheetPptx(
  data: DatasheetProductData,
  opts?: { tokens?: DatasheetTokens; cover?: boolean }
): Promise<Buffer> {
  const tokens = opts?.tokens ?? DEFAULT_TOKENS;
  const pres = createDatasheetPresentation(opts?.cover === false ? false : { products: [data] }, tokens);

  appendProductDatasheetSlide(pres, data, { tokens });

  const out = await pres.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
