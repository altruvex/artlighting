import "server-only";

export const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type PdfResult =
  | { ok: true; pdf: Uint8Array<ArrayBuffer> }
  | { ok: false; reason: "notConfigured" | "unreachable" | "failed" };

/**
 * PPTX → PDF through the LibreOffice worker, so the PDF is the same render as
 * the PowerPoint file (D12). Shared by every document route.
 */
export async function convertPptxToPdf(pptx: Buffer): Promise<PdfResult> {
  const workerUrl = process.env.DATASHEET_WORKER_URL;
  const workerSecret = process.env.DATASHEET_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return { ok: false, reason: "notConfigured" };

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/convert`, {
      method: "POST",
      headers: { "X-Datasheet-Worker-Secret": workerSecret, "Content-Type": PPTX_CONTENT_TYPE },
      body: new Uint8Array(pptx),
    });
  } catch (err) {
    console.error("document: PDF worker request failed", err);
    return { ok: false, reason: "unreachable" };
  }
  if (!res.ok) {
    console.error("document: PDF worker returned", res.status, await res.text());
    return { ok: false, reason: "failed" };
  }
  return { ok: true, pdf: new Uint8Array(await res.arrayBuffer()) };
}
