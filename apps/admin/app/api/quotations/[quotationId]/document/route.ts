import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { buildQuotationPptx } from "@repo/datasheet";
import { AdminAuthError, requirePermission } from "@/lib/auth";
import { logQuotationActivity, quotationScope } from "@/lib/quotations/access";
import { prisma } from "@repo/database";
import { convertPptxToPdf, PPTX_CONTENT_TYPE } from "@/lib/documents/pdf";
import { getQuotationDocumentData } from "@/lib/quotations/document";
import { buildQuotationXlsx } from "@/lib/quotations/xlsx";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** GET ?format=pptx|pdf|xlsx — the quotation as a file, rendered from what is saved. */
export async function GET(req: Request, { params }: { params: Promise<{ quotationId: string }> }) {
  const t = await getTranslations("Quotations.documentErrors");
  let admin;
  try {
    admin = await requirePermission("quotation:read");
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "unauthenticated" ? 401 : 403 });
    }
    throw err;
  }

  const { quotationId } = await params;
  const requested = new URL(req.url).searchParams.get("format");
  const format = requested === "pdf" || requested === "xlsx" ? requested : "pptx";

  // A salesperson may download only the quotations they own.
  const visible = await prisma.quotation.findFirst({ where: { id: quotationId, ...quotationScope(admin) }, select: { id: true } });
  const data = visible ? await getQuotationDocumentData(quotationId) : null;
  if (!data) return NextResponse.json({ error: t("notFound") }, { status: 404 });
  // What left the building, and who took it.
  await logQuotationActivity(prisma, { quotationId, admin, action: "DOCUMENT_EXPORTED", detail: { format } });

  const disposition = (ext: string) => `attachment; filename="${data.number}.${ext}"`;

  if (format === "xlsx") {
    const xlsx = await buildQuotationXlsx(data);
    return new Response(new Uint8Array(xlsx), {
      headers: { "Content-Type": XLSX_CONTENT_TYPE, "Content-Disposition": disposition("xlsx") },
    });
  }

  let pptx: Buffer;
  try {
    pptx = await buildQuotationPptx(data);
  } catch (err) {
    console.error("quotation: failed to build PPTX", err);
    return NextResponse.json({ error: t("generateFailed") }, { status: 500 });
  }

  if (format === "pptx") {
    return new Response(new Uint8Array(pptx), {
      headers: { "Content-Type": PPTX_CONTENT_TYPE, "Content-Disposition": disposition("pptx") },
    });
  }

  const pdf = await convertPptxToPdf(pptx);
  if (!pdf.ok) {
    return NextResponse.json(
      { error: t(pdf.reason) },
      { status: pdf.reason === "notConfigured" ? 503 : 502 },
    );
  }
  return new Response(pdf.pdf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": disposition("pdf") },
  });
}
