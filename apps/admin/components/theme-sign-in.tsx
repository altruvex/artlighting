"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      setError(error.status === 429 ? t("errors.tooManyAttempts") : t("errors.invalidCredentials"));
      return;
    }
    router.push(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-surface animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 rounded-3xl p-8 shadow-2xl shadow-black/5 sm:p-10"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Image src="/logo-en.png" alt="" width={36} height={36} className="rounded-md" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="glow-ring-focus space-y-2 rounded-xl">
          <Label htmlFor="email">{t("email")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl ps-10"
              required
            />
          </div>
        </div>

        <div className="glow-ring-focus space-y-2 rounded-xl">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl ps-10"
              required
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/30 disabled:opacity-70"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
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
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/admin/dashboard";
}
