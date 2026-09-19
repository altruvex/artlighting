"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Download } from "lucide-react";

type Category = { id: string; name: string };

interface JobStatusResponse {
  status: "queued" | "running" | "done" | "error";
  total: number;
  completed: number;
  skipped: { productCode: string; reason: string }[];
  error?: string;
}

const POLL_INTERVAL_MS = 2000;

export default function BulkGenerateSheet({ topCategories }: { topCategories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "category">("all");
  const [categoryId, setCategoryId] = useState<string | undefined>(topCategories[0]?.id);
  const [format, setFormat] = useState<"pptx" | "pdf">("pptx");
  const [outputShape, setOutputShape] = useState<"zip" | "combined">("zip");

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  async function startJob() {
    setStarting(true);
    setStartError(null);
    setJob(null);
    try {
      const res = await fetch("/api/products/datasheet/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          categoryId: scope === "category" ? categoryId : undefined,
          format,
          outputShape,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "failed to start job");

      setJobId(body.jobId);
      pollRef.current = setInterval(() => void pollStatus(body.jobId), POLL_INTERVAL_MS);
      void pollStatus(body.jobId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  }

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`/api/products/datasheet/bulk/${id}`, { cache: "no-store" });
      const body = (await res.json()) as JobStatusResponse;
      setJob(body);
      if (body.status === "done" || body.status === "error") stopPolling();
    } catch {
      // transient network hiccup — the next poll tick will retry
    }
  }

  function reset() {
    stopPolling();
    setJobId(null);
    setJob(null);
    setStartError(null);
  }

  const progressPct = job && job.total > 0 ? Math.round((job.completed / job.total) * 100) : 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4" /> Bulk generate
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Bulk generate datasheets</SheetTitle>
          <SheetDescription>
            Runs in the background — this can take several minutes for the full catalog. You
            can close this panel and come back.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Scope</label>
            <Select value={scope} onValueChange={(v) => setScope(v as "all" | "category")}>
              <SelectTrigger className="rounded-xl" disabled={!!jobId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All active products</SelectItem>
                <SelectItem value="category">By category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "category" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="rounded-xl" disabled={!!jobId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as "pptx" | "pdf")}>
              <SelectTrigger className="rounded-xl" disabled={!!jobId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pptx">PPTX</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Output</label>
            <Select
              value={outputShape}
              onValueChange={(v) => setOutputShape(v as "zip" | "combined")}
            >
              <SelectTrigger className="rounded-xl" disabled={!!jobId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zip">Zip of individual files</SelectItem>
                <SelectItem value="combined">Combined by category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {startError && <p className="text-sm text-destructive">{startError}</p>}

          {job && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {job.status === "done"
                    ? "Done"
                    : job.status === "error"
                      ? "Failed"
                      : "Generating…"}
                </span>
                <span className="text-muted-foreground">
                  {job.completed}/{job.total}
                </span>
              </div>
              <Progress value={progressPct} />
              {job.error && <p className="text-sm text-destructive">{job.error}</p>}
              {job.skipped.length > 0 && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {job.skipped.length} skipped:
                  </p>
                  {job.skipped.map((s) => (
                    <p key={s.productCode}>
                      {s.productCode} — {s.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          {job?.status === "done" ? (
            <>
              <Button className="rounded-xl" asChild>
                <a href={`/api/products/datasheet/bulk/${jobId}/download`}>
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={reset}>
                Start another
              </Button>
            </>
          ) : (
            <Button
              className="rounded-xl"
              disabled={starting || (!!jobId && job?.status !== "error")}
              onClick={startJob}
            >
              {starting ? "Starting…" : jobId ? "Generating…" : "Start"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
