import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { AdminAuthError, requirePermission } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const t = await getTranslations("BulkDatasheet");
  try {
    await requirePermission("datasheet:generate");
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
    workerRes = await fetch(`${workerUrl}/jobs/${jobId}`, {
      headers: { "X-Datasheet-Worker-Secret": workerSecret },
      cache: "no-store",
    });
  } catch (err) {
    console.error("bulk datasheet: worker status request failed", err);
    return NextResponse.json({ error: t("errors.unreachable") }, { status: 502 });
  }

  const rawBody = await workerRes.text();
  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.error("bulk datasheet: worker returned non-JSON status response", workerRes.status, rawBody.slice(0, 500));
    return NextResponse.json({ error: t("errors.unexpectedResponse") }, { status: 502 });
  }
  return NextResponse.json(body, { status: workerRes.status });
}
