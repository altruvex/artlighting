import {
  createDatasheetPresentation,
  appendProductDatasheetSlide,
  buildProductDatasheetPptx,
} from "@repo/datasheet";
import {
  getDatasheetProductRows,
  mapProductToDatasheetData,
  type ProductWithDatasheetRelations,
} from "@repo/datasheet-data";
import { runConversion } from "../convert";
import { incrementJobProgress, updateJob, type SkippedEntry } from "./store";
import { mapWithConcurrency, Semaphore } from "./concurrency-limit";
import { zipFiles, type BuiltFile } from "./zip-files";

const CONCURRENCY = Number(process.env.BULK_CONCURRENCY ?? 3);
// Serial by default: a real local test showed even 2 concurrent LibreOffice
// conversions crash one under resource contention (isolated profiles don't
// fully prevent it). A crashed conversion degrades gracefully (skipped, not
// fatal to the job) either way, but starting serial is the safer default;
// raise this only after confirming the deployed instance handles more.
const CONVERSION_CONCURRENCY = Number(process.env.BULK_CONVERSION_CONCURRENCY ?? 1);
const conversionLimiter = new Semaphore(CONVERSION_CONCURRENCY);

export interface BulkJobParams {
  productIds: string[];
  language?: "en" | "ar";
  format: "pptx" | "pdf";
  outputShape: "zip" | "combined";
}

export async function runBulkJob(jobId: string, params: BulkJobParams): Promise<void> {
  updateJob(jobId, { status: "running" });

  try {
    const { found, missingIds } = await getDatasheetProductRows(params.productIds);
    const skipped: SkippedEntry[] = missingIds.map((id) => ({
      productCode: id,
      reason: "product not found",
    }));
    // Missing ids never enter the per-product build loop below, so they'd
    // otherwise never count toward progress — leaving completed permanently
    // short of total even once the job is done.
    for (let i = 0; i < missingIds.length; i++) incrementJobProgress(jobId);

    const files =
      params.outputShape === "zip"
        ? await buildPerProductFiles(jobId, found, params, skipped)
        : await buildCombinedFiles(jobId, found, params, skipped);

    const zipPath = await zipFiles(jobId, files);
    updateJob(jobId, { status: "done", resultPath: zipPath, skipped });
  } catch (err) {
    updateJob(jobId, { status: "error", error: err instanceof Error ? err.message : String(err) });
  }
}

async function toOutputBuffer(pptxBuffer: Buffer, format: "pptx" | "pdf"): Promise<Buffer> {
  if (format !== "pdf") return pptxBuffer;
  return conversionLimiter.run(() => runConversion(pptxBuffer));
}

/** "zip" mode: one standalone file per product. */
async function buildPerProductFiles(
  jobId: string,
  products: ProductWithDatasheetRelations[],
  params: BulkJobParams,
  skipped: SkippedEntry[]
): Promise<BuiltFile[]> {
  const results = await mapWithConcurrency(products, CONCURRENCY, async (product) => {
    try {
      const data = await mapProductToDatasheetData(product, params.language ?? "en");
      const pptxBuffer = await buildProductDatasheetPptx(data);
      const buffer = await toOutputBuffer(pptxBuffer, params.format);
      return { name: `${data.productCode}.${params.format}`, buffer } satisfies BuiltFile;
    } catch (err) {
      skipped.push({
        productCode: product.productId,
        reason: err instanceof Error ? err.message : String(err),
      });
      return null;
    } finally {
      incrementJobProgress(jobId);
    }
  });

  return results.filter((r): r is BuiltFile => r !== null);
}

/**
 * "combined" mode: products grouped by top-level Category name, each group
 * drawn onto ONE shared Presentation (the only way pptxgenjs supports
 * merging multiple products' slides into a single deck — this is why bulk
 * generation has to run where @repo/datasheet itself can run, not just
 * where finished .pptx bytes can be shipped around).
 */
async function buildCombinedFiles(
  jobId: string,
  products: ProductWithDatasheetRelations[],
  params: BulkJobParams,
  skipped: SkippedEntry[]
): Promise<BuiltFile[]> {
  const groups = new Map<string, ProductWithDatasheetRelations[]>();
  for (const product of products) {
    const key = product.category.name;
    const group = groups.get(key);
    if (group) group.push(product);
    else groups.set(key, [product]);
  }

  const files: BuiltFile[] = [];

  for (const [categoryName, groupProducts] of groups) {
    // Image resolution (the slow, network-bound part) is concurrency-limited;
    // appending each mapped product's slide onto the shared Presentation
    // happens afterward, sequentially, since pptxgenjs slide operations
    // aren't safe to interleave across concurrent calls on one Presentation.
    const mapped = await mapWithConcurrency(groupProducts, CONCURRENCY, async (product) => {
      try {
        const data = await mapProductToDatasheetData(product, params.language ?? "en");
        return data;
      } catch (err) {
        skipped.push({
          productCode: product.productId,
          reason: err instanceof Error ? err.message : String(err),
        });
        return null;
      } finally {
        incrementJobProgress(jobId);
      }
    });

    const pres = createDatasheetPresentation();
    let addedAny = false;
    for (const data of mapped) {
      if (!data) continue;
      appendProductDatasheetSlide(pres, data);
      addedAny = true;
    }
    if (!addedAny) continue;

    const pptxBuffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
    const buffer = await toOutputBuffer(pptxBuffer, params.format);
    files.push({ name: `${categoryName}.${params.format}`, buffer });
  }

  return files;
}
