import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { promisify } from "node:util";
import express from "express";
import { checkSecret } from "./auth.ts";
import { ConversionError, runConversion } from "./convert.ts";
import { createJob, deleteJob, getJob } from "./jobs/store.ts";
import { runBulkJob, type BulkJobParams } from "./jobs/run-bulk-job.ts";

const execFileAsync = promisify(execFile);
const SOFFICE_BIN = process.env.SOFFICE_BIN ?? "soffice";
const PORT = Number(process.env.PORT ?? 8080);

const app = express();

app.get("/health", async (_req, res) => {
  try {
    const { stdout } = await execFileAsync(SOFFICE_BIN, ["--version"]);
    res.json({ ok: true, libreoffice: stdout.trim() });
  } catch (err) {
    res
      .status(503)
      .json({ ok: false, error: err instanceof Error ? err.message : "LibreOffice unreachable" });
  }
});

app.post(
  "/convert",
  checkSecret,
  express.raw({
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    limit: "50mb",
  }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "expected raw PPTX bytes in the request body" });
      return;
    }

    try {
      const pdf = await runConversion(req.body);
      res.setHeader("Content-Type", "application/pdf");
      res.status(200).send(pdf);
    } catch (err) {
      const message = err instanceof ConversionError ? err.message : "conversion failed";
      res.status(422).json({ error: message });
    }
  }
);

app.post("/jobs", checkSecret, express.json({ limit: "1mb" }), (req, res) => {
  const body = req.body as Partial<BulkJobParams>;

  if (
    !Array.isArray(body.productIds) ||
    body.productIds.length === 0 ||
    !body.productIds.every((id) => typeof id === "string")
  ) {
    res.status(400).json({ error: "productIds must be a non-empty array of strings" });
    return;
  }
  if (body.format !== "pptx" && body.format !== "pdf") {
    res.status(400).json({ error: "format must be 'pptx' or 'pdf'" });
    return;
  }
  if (body.outputShape !== "zip" && body.outputShape !== "combined") {
    res.status(400).json({ error: "outputShape must be 'zip' or 'combined'" });
    return;
  }
  if (body.language !== undefined && body.language !== "en" && body.language !== "ar") {
    res.status(400).json({ error: "language must be 'en' or 'ar'" });
    return;
  }

  const params: BulkJobParams = {
    productIds: body.productIds,
    language: body.language,
    format: body.format,
    outputShape: body.outputShape,
  };
  const job = createJob(params.productIds.length);
  void runBulkJob(job.id, params);

  res.status(202).json({ jobId: job.id });
});

app.get("/jobs/:id", checkSecret, (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  res.json({
    status: job.status,
    total: job.total,
    completed: job.completed,
    skipped: job.skipped,
    error: job.error,
  });
});

app.get("/jobs/:id/download", checkSecret, (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  if (job.status !== "done" || !job.resultPath) {
    res.status(409).json({ error: `job is not ready (status: ${job.status})` });
    return;
  }

  const resultPath = job.resultPath;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="datasheets-${job.id}.zip"`);

  const stream = createReadStream(resultPath);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "failed to read result file" });
  });
  stream.on("close", () => {
    void deleteJob(job.id);
  });
  stream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`datasheet-worker listening on :${PORT}`);
});
