import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { jobId } = await params;

  const workerUrl = process.env.DATASHEET_WORKER_URL;
  const workerSecret = process.env.DATASHEET_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return NextResponse.json({ error: "bulk generation is not configured" }, { status: 503 });
  }

  let workerRes: Response;
  try {
    workerRes = await fetch(`${workerUrl}/jobs/${jobId}/download`, {
      headers: { "X-Datasheet-Worker-Secret": workerSecret },
    });
  } catch (err) {
    console.error("bulk datasheet: worker download request failed", err);
    return NextResponse.json({ error: "bulk generation service unreachable" }, { status: 502 });
  }

  if (!workerRes.ok) {
    const body = await workerRes.json().catch(() => ({ error: "download failed" }));
    return NextResponse.json(body, { status: workerRes.status });
  }

  const zipBuffer = new Uint8Array(await workerRes.arrayBuffer());
  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="datasheets-${jobId}.zip"`,
    },
  });
}
