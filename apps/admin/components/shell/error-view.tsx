"use client";

import { Button } from "@repo/ui/components/button";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";

/**
 * What a screen shows when it throws while rendering, instead of Next's bare
 * "Application error". Server errors reach the browser with only a `digest`
 * (the message is stripped so internals don't leak); showing it lets a
 * staff member's report be matched to the Vercel log line.
 */
export function ErrorView({ error, retry, fullPage = false }: { error: unknown; retry: () => void; fullPage?: boolean }) {
  const t = useTranslations("ErrorPage");
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className={`flex items-center justify-center p-4 ${fullPage ? "min-h-svh bg-background" : "min-h-[60svh]"}`}>
      <div role="alert" className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-e1">
        <span
          aria-hidden
          className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger/12 text-danger"
        >
          <TriangleAlertIcon className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-[length:var(--text-xl)] text-balance">{t("title")}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{t("description")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" className="w-full" onClick={() => retry()}>
            {t("retry")}
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/dashboard">{t("dashboard")}</Link>
          </Button>
        </div>
        {digest && (
          <p className="text-xs text-muted-foreground">
            {t("reference")}: <span dir="ltr" className="font-mono">{digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
