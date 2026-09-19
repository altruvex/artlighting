import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth";
import { prisma } from "@repo/database";

interface BulkStartRequest {
  scope: "all" | "category";
  categoryId?: string;
  language?: "en" | "ar";
  format: "pptx" | "pdf";
  outputShape: "zip" | "combined";
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const body = (await req.json()) as Partial<BulkStartRequest>;

  if (body.scope !== "all" && body.scope !== "category") {
    return NextResponse.json({ error: "scope must be 'all' or 'category'" }, { status: 400 });
  }
  if (body.scope === "category" && !body.categoryId) {
    return NextResponse.json({ error: "categoryId is required when scope is 'category'" }, { status: 400 });
  }
  if (body.format !== "pptx" && body.format !== "pdf") {
    return NextResponse.json({ error: "format must be 'pptx' or 'pdf'" }, { status: 400 });
  }
  if (body.outputShape !== "zip" && body.outputShape !== "combined") {
    return NextResponse.json({ error: "outputShape must be 'zip' or 'combined'" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(body.scope === "category"
        ? { OR: [{ categoryId: body.categoryId }, { lightingtypeId: body.categoryId }] }
        : {}),
    },
    select: { id: true },
  });

  if (products.length === 0) {
    return NextResponse.json({ error: "no active products match that scope" }, { status: 400 });
  }

  const workerUrl = process.env.DATASHEET_WORKER_URL;
  const workerSecret = process.env.DATASHEET_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return NextResponse.json(
      { error: "Bulk generation is not configured (DATASHEET_WORKER_URL/DATASHEET_WORKER_SECRET unset)" },
      { status: 503 }
    );
  }

  let workerRes: Response;
  try {
    workerRes = await fetch(`${workerUrl}/jobs`, {
      method: "POST",
      headers: {
        "X-Datasheet-Worker-Secret": workerSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productIds: products.map((p) => p.id),
        language: body.language,
        format: body.format,
        outputShape: body.outputShape,
      }),
    });
  } catch (err) {
    console.error("bulk datasheet: worker request failed", err);
    return NextResponse.json({ error: "bulk generation service unreachable" }, { status: 502 });
  }

  // The worker is a separate deployable and can be down, mid-deploy, or
  // behind a gateway that returns an HTML error page — never assume its
  // response body is JSON just because a request completed.
  const rawBody = await workerRes.text();
  let workerBody: { jobId?: string; error?: string } = {};
  try {
    workerBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.error("bulk datasheet: worker returned non-JSON response", workerRes.status, rawBody.slice(0, 500));
    return NextResponse.json({ error: "bulk generation service returned an unexpected response" }, { status: 502 });
  }

  if (!workerRes.ok || !workerBody.jobId) {
    return NextResponse.json({ error: workerBody.error ?? "failed to start job" }, { status: 502 });
  }

  return NextResponse.json({ jobId: workerBody.jobId, total: products.length });
}
