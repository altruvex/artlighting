import { ThemedSignIn } from "@/components/theme-sign-in";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";

/** Account pages have no content of their own to rank — index them and Google indexes N empty duplicates of the same form. */
export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return constructMetadata({ locale, path: "/sign-in", title: t("signInTitle"), noIndex: true });
}

const SignInPage = async ({ params }: PagePropsTypes) => {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <main className="relative grid min-h-dvh bg-background lg:grid-cols-2">

      <>
        {/* The photograph keeps its dark ground in either theme, so the
            panel takes the dark token set rather than hard-coded white and
            black: text, scrim and the gold eyebrow all come from it. */}
        <div className="dark relative hidden lg:block">
          <Image
            src="/new-collection/new-collection-2.jpg"
            alt={t("imageAlt")}
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-background/85 via-background/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 max-w-xl p-12 text-foreground">
            <p className="eyebrow">{locale === "ar" ? "آرت لايتنج" : "Art Lighting"}</p>
            <h2 className="mt-3 mb-3 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">{t("panelSignInTitle")}</h2>
            <p className="max-w-md text-pretty text-[length:var(--text-sm)] text-foreground/80">{t("panelSignInBody")}</p>
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center px-4 py-20 sm:px-12">
          {/* In the form's column, not over the photograph: one colour works
              for it in both themes and at every width. */}
          <Link
            href="/"
            className="absolute start-4 top-5 z-10 inline-flex min-h-10 items-center gap-2 text-[length:var(--text-sm)] text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground sm:start-6"
          >
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("backHome")}
          </Link>
          <Suspense fallback={<div className="text-[length:var(--text-sm)] text-muted-foreground">{t("loading")}</div>}>
            <ThemedSignIn />
          </Suspense>
        </div>
      </>
    </main>
  );
};

export default SignInPage;
