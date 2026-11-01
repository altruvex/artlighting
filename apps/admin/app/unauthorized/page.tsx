"use client";

import { Button } from "@repo/ui/components/button";
import { ShieldAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function UnauthorizedPage() {
  const t = useTranslations("Unauthorized");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-e1">
        <span
          aria-hidden
          className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger/12 text-danger"
        >
          <ShieldAlertIcon className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-[length:var(--text-xl)] text-balance">{t("title")}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{t("description")}</p>
        </div>
        <p className="text-xs text-muted-foreground text-pretty">{t("hint")}</p>
        <Button asChild size="sm" className="w-full">
          <Link href="/sign-in">{t("backToSignIn")}</Link>
        </Button>
      </div>
    </main>
  );
}
