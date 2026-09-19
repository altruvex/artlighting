"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
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
import { LayersIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

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
  const t = useTranslations("BulkDatasheet");
  const tCommon = useTranslations("Common");
  const formatter = useFormatter();
  const fieldId = useId();
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
      if (!res.ok) throw new Error(body?.error ?? t("errors.startFailed"));

      setJobId(body.jobId);
      pollRef.current = setInterval(() => void pollStatus(body.jobId), POLL_INTERVAL_MS);
      void pollStatus(body.jobId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : tCommon("genericError"));
    } finally {
      setStarting(false);
    }
  }

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`/api/products/datasheet/bulk/${id}`, { cache: "no-store" });
      // A non-2xx answer is { error } (worker down, job expired), not a job:
      // treating it as one crashed the sheet on `job.skipped.length`.
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        stopPolling();
        setJobId(null);
        setStartError(body?.error ?? tCommon("genericError"));
        return;
      }
      const body = (await res.json()) as JobStatusResponse;
      setJob(body);
      if (body.status === "done" || body.status === "error") stopPolling();
    } catch (err) {
      // Transient network hiccup — the next poll tick retries, so this stays
      // silent for the admin, but it is logged rather than swallowed: a poll
      // that fails every tick is otherwise invisible.
      console.error("bulk datasheet: poll failed", err);
    }
  }

  function reset() {
    stopPolling();
    setJobId(null);
    setJob(null);
    setStartError(null);
  }

  const progressPct = job && job.total > 0 ? Math.round((job.completed / job.total) * 100) : 0;
  const locked = !!jobId && job?.status !== "error";
  const failed = job?.status === "error";

  const statusLabel = !job
    ? t("status.queued")
    : job.status === "done"
      ? t("status.done")
      : job.status === "error"
        ? t("status.failed")
        : job.status === "queued"
          ? t("status.queued")
          : t("status.generating");

  const statusTone: StatusTone = !job
    ? "neutral"
    : job.status === "done"
      ? "success"
      : job.status === "error"
        ? "danger"
        : "info";

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
          <LayersIcon className="size-4" aria-hidden /> {t("trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4">
          <section className="space-y-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("settingsTitle")}
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-scope`}>{t("scope")}</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as "all" | "category")}
                disabled={locked}
              >
                <SelectTrigger id={`${fieldId}-scope`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("scopeAll")}</SelectItem>
                  <SelectItem value="category">{t("scopeCategory")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "category" && (
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-category`}>{t("category")}</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={locked}>
                  <SelectTrigger id={`${fieldId}-category`} className="w-full">
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

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-format`}>{t("format")}</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as "pptx" | "pdf")}
                disabled={locked}
              >
                <SelectTrigger id={`${fieldId}-format`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pptx">PPTX</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-output`}>{t("output")}</Label>
              <Select
                value={outputShape}
                onValueChange={(v) => setOutputShape(v as "zip" | "combined")}
                disabled={locked}
              >
                <SelectTrigger id={`${fieldId}-output`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">{t("outputZip")}</SelectItem>
                  <SelectItem value="combined">{t("outputCombined")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {locked && <p className="text-xs text-muted-foreground">{t("settingsLocked")}</p>}
          </section>

          {startError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-sm font-medium text-destructive">{t("errors.title")}</p>
              <p className="text-sm text-muted-foreground">{startError}</p>
            </div>
          )}

          {job && (
            <section className="space-y-3 rounded-lg border p-3" aria-live="polite">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t("progressCount", {
                    completed: formatter.number(job.completed),
                    total: formatter.number(job.total),
                  })}
                </span>
              </div>

              <Progress
                value={progressPct}
                aria-label={t("progressLabel")}
                aria-valuetext={`${progressPct}%`}
              />

              {failed && job.error && <p className="text-sm text-destructive">{job.error}</p>}

              {job.skipped.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">
                    {t("skippedTitle")} · {t("skipped", { count: job.skipped.length })}
                  </p>
                  <ul className="max-h-40 divide-y overflow-y-auto rounded-md border text-xs">
                    {job.skipped.map((s) => (
                      <li key={s.productCode} className="px-2 py-1.5">
                        <span className="font-mono" dir="ltr">
                          {s.productCode}
                        </span>
                        <span className="block text-muted-foreground">{s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        <SheetFooter className="border-t">
          {job?.status === "done" ? (
            <>
              <Button asChild>
                <a href={`/api/products/datasheet/bulk/${jobId}/download`}>
                  <DownloadIcon className="size-4" aria-hidden /> {t("download")}
                </a>
              </Button>
              <Button variant="outline" onClick={reset}>
                {t("startAnother")}
              </Button>
            </>
          ) : (
            <Button disabled={starting || locked} onClick={startJob}>
              {(starting || locked) && (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              )}
              {starting ? t("starting") : locked ? t("status.generating") : t("start")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
