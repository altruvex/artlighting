"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

export function ThemedSignIn() {
  const t = useTranslations("SignIn");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setIsLoading(false);
    if (error) {
      // Only a 401 means the email or password is wrong. Anything else
      // (403 INVALID_ORIGIN, 5xx, network) is a server/config problem and
      // must not be reported as a wrong password.
      if (error.status === 429) setError(t("errors.tooManyAttempts"));
      else if (error.status === 401) setError(t("errors.invalidCredentials"));
      else {
        console.error("[sign-in]", error.status, error.code, error.message);
        setError(t("errors.unexpected"));
      }
      return;
    }
    router.push(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      // The system's radius and elevation, like every other surface: the
      // 3xl corners and 2xl shadow made the one card in the admin that did
      // not belong to it. The entrance is a short settle, not a slide.
      className="glass-surface animate-in fade-in slide-in-from-bottom-2 duration-(--dur-sheet) ease-(--ease-out) space-y-6 rounded-lg p-6 shadow-e3 sm:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-lg border bg-background">
          <Image src="/logo-en.png" alt="" width={32} height={32} className="rounded-sm" />
        </div>
        <p className="eyebrow">{t("brand")}</p>
        <h1 className="mt-2 text-[length:var(--text-xl)] text-foreground">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 ps-9"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 ps-9"
              required
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground text-pretty">
        {t("accessNote")}
      </p>
    </form>
  );
}

/**
 * Where to land after signing in. Only same-site paths are accepted: a
 * `next` of "https://elsewhere" or "//elsewhere" would otherwise turn the
 * sign-in page into an open redirect.
 */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return "/dashboard";
}
