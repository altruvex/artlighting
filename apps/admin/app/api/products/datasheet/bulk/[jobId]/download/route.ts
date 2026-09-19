import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const t = await getTranslations("BulkDatasheet");
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
    }
    throw err;
  }

  const { jobId } = await params;

  const workerUrl = process.env.DATASHEET_WORKER_URL;
  const workerSecret = process.env.DATASHEET_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return NextResponse.json({ error: t("errors.notConfigured") }, { status: 503 });
  }

  let workerRes: Response;
  try {
    workerRes = await fetch(`${workerUrl}/jobs/${jobId}/download`, {
      headers: { "X-Datasheet-Worker-Secret": workerSecret },
    });
  } catch (err) {
    console.error("bulk datasheet: worker download request failed", err);
    return NextResponse.json({ error: t("errors.unreachable") }, { status: 502 });
  }

  if (!workerRes.ok) {
    const body = await workerRes.json().catch(() => ({ error: t("errors.downloadFailed") }));
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
