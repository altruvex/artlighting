"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { authErrorKey } from "@/lib/auth-errors";

export function ThemedSignIn() {
  const router = useRouter();
  const t = useTranslations("auth");
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
      // Better Auth answers in English with a code; the code is what we
      // translate, so the customer reads the reason in their own language.
      setError(t(authErrorKey(error, "signInFailed")));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-[var(--dur-sheet)] ease-[var(--ease-out)]"
    >
      <div>
        {/* The shared eyebrow: capitals and tracking in English only — the
            hand-set uppercase tracking-[0.2em] pulled Arabic letters apart. */}
        <p className="eyebrow">{t("welcomeBack")}</p>
        <h1 className="mt-3 text-[length:var(--text-2xl)] font-medium leading-tight text-foreground ltr:tracking-tight">{t("signInTitle")}</h1>
        <p className="mt-2 text-pretty text-[length:var(--text-sm)] text-muted-foreground">{t("signInSubtitle")}</p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2.5 text-[length:var(--text-sm)] text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 ps-10 pe-3"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="h-11 w-full text-base font-medium disabled:opacity-70"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("signingIn")}
          </>
        ) : (
          t("signIn")
        )}
      </Button>

      <p className="text-center text-[length:var(--text-sm)] text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </form>
  );
}
