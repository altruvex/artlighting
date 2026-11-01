import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { AdminAuthError, requirePermission } from "@/lib/auth";
import { buildProductDatasheetPptx, checkDatasheetLayout, type DatasheetProductData } from "@repo/datasheet";
import { draftToDatasheetData, productImageResolver } from "@repo/datasheet-data";
import { datasheetDraftSchema } from "@/lib/datasheet/draft-schema";
import { getDatasheetProductData } from "@/lib/datasheet/get-datasheet-data";
import { convertPptxToPdf, PPTX_CONTENT_TYPE } from "@/lib/documents/pdf";

async function authorize(t: Awaited<ReturnType<typeof getTranslations<"Datasheet">>>) {
  try {
    await requirePermission("datasheet:generate");
    return null;
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json(
        { error: err.reason === "unauthenticated" ? t("errors.unauthorized") : err.message },
        { status: err.reason === "unauthenticated" ? 401 : 403 },
      );
    }
    throw err;
  }
}

async function render(
  data: DatasheetProductData,
  format: "pptx" | "pdf",
  t: Awaited<ReturnType<typeof getTranslations<"Datasheet">>>,
) {
  let pptx: Buffer;
  try {
    pptx = await buildProductDatasheetPptx(data);
  } catch (err) {
    console.error("datasheet: failed to build PPTX", err);
    return NextResponse.json({ error: t("errors.generateFailed") }, { status: 500 });
  }

  const filename = (data.productCode || "datasheet").replace(/[^\w.-]+/g, "_");
  if (format === "pptx") {
    return new Response(new Uint8Array(pptx), {
      headers: { "Content-Type": PPTX_CONTENT_TYPE, "Content-Disposition": `attachment; filename="${filename}.pptx"` },
    });
  }

  const pdf = await convertPptxToPdf(pptx);
  if (!pdf.ok) {
    const error =
      pdf.reason === "notConfigured"
        ? t("errors.pdfNotConfigured")
        : pdf.reason === "unreachable"
          ? t("errors.pdfUnreachable")
          : t("errors.pdfFailed");
    return NextResponse.json({ error }, { status: pdf.reason === "notConfigured" ? 503 : 502 });
  }
  return new Response(pdf.pdf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` },
  });
}

/** GET: the product's sheet as it stands — the quick download buttons. */
export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const t = await getTranslations("Datasheet");
  const denied = await authorize(t);
  if (denied) return denied;

  const { productId } = await params;
  const format = new URL(req.url).searchParams.get("format") === "pdf" ? "pdf" : "pptx";
  const data = await getDatasheetProductData(productId);
  if (!data) return NextResponse.json({ error: t("errors.notFound") }, { status: 404 });
  return render(data, format, t);
}

/**
 * POST: a sheet edited in the studio. The edits are used for this file only;
 * saving them to the product is a separate, explicit action. Pictures come
 * from the product's own images by id, never from a URL in the request.
 */
export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const t = await getTranslations("Datasheet");
  const denied = await authorize(t);
  if (denied) return denied;

  const { productId } = await params;
  const body = (await req.json().catch(() => null)) as { draft?: unknown; format?: unknown } | null;
  const parsed = datasheetDraftSchema.safeParse(body?.draft);
  if (!parsed.success || parsed.data.productId !== productId) {
    return NextResponse.json({ error: t("errors.invalidDraft") }, { status: 400 });
  }

  const data = await draftToDatasheetData(parsed.data, await productImageResolver(productId));
  const report = checkDatasheetLayout(data);
  if (report.specsOverflow || report.descriptionTooLong) {
    return NextResponse.json({ error: t("errors.doesNotFit") }, { status: 422 });
  }
  return render(data, body?.format === "pdf" ? "pdf" : "pptx", t);
}
