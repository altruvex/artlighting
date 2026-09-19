import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth";
import { buildProductDatasheetPptx } from "@repo/datasheet";
import { getDatasheetProductData } from "@/lib/datasheet/get-datasheet-data";

const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { productId } = await params;
  const format = new URL(req.url).searchParams.get("format") === "pdf" ? "pdf" : "pptx";

  const data = await getDatasheetProductData(productId);
  if (!data) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  let pptxBuffer: Buffer;
  try {
    pptxBuffer = await buildProductDatasheetPptx(data);
  } catch (err) {
    console.error("datasheet: failed to build PPTX", err);
    return NextResponse.json({ error: "failed to generate datasheet" }, { status: 500 });
  }

  if (format === "pptx") {
    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type": PPTX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${data.productCode}.pptx"`,
      },
    });
  }

  const workerUrl = process.env.DATASHEET_WORKER_URL;
  const workerSecret = process.env.DATASHEET_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return NextResponse.json(
      { error: "PDF export is not configured (DATASHEET_WORKER_URL/DATASHEET_WORKER_SECRET unset)" },
      { status: 503 }
    );
  }

  let pdfRes: globalThis.Response;
  try {
    pdfRes = await fetch(`${workerUrl}/convert`, {
      method: "POST",
      headers: {
        "X-Datasheet-Worker-Secret": workerSecret,
        "Content-Type": PPTX_CONTENT_TYPE,
      },
      body: new Uint8Array(pptxBuffer),
    });
  } catch (err) {
    console.error("datasheet: worker request failed", err);
    return NextResponse.json({ error: "PDF conversion service unreachable" }, { status: 502 });
  }

  if (!pdfRes.ok) {
    console.error("datasheet: worker returned", pdfRes.status, await pdfRes.text());
    return NextResponse.json({ error: "PDF conversion failed" }, { status: 502 });
  }

  const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.productCode}.pdf"`,
    },
  });
}
