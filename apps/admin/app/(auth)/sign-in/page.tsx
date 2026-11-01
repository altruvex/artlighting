import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemedSignIn } from "@/components/theme-sign-in";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SignInPage = async () => {
  const t = await getTranslations("SignIn");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Ambient glow field — the same warm light the product line sells,
          used as the interface's own atmosphere. Still, not drifting: an
          endless background animation is motion nobody asked for on a page
          whose one job is a form. Logical insets, so it mirrors in Arabic. */}
      <div
        className="glow-orb -top-32 -start-24 h-[28rem] w-[28rem] bg-primary/20 dark:bg-primary/15"
        aria-hidden
      />
      <div
        className="glow-orb top-1/2 -end-32 h-[24rem] w-[24rem] bg-primary/15 dark:bg-primary/10"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_70%)]"
        aria-hidden
      />

      <Link
        href="/"
        className="absolute start-4 top-4 z-10 flex h-8 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors duration-(--dur-hover) ease-(--ease-out) outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:start-6 sm:top-6"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
        {t("backHome")}
      </Link>

      <LanguageSwitcher className="absolute end-4 top-4 z-10 sm:end-6 sm:top-6" />

      <div className="relative z-10 w-full max-w-md">
        <ThemedSignIn />
      </div>
    </main>
  );
};

export default SignInPage;
