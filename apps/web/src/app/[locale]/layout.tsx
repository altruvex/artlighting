import { Providers } from "@/components/providers";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { pickClientMessages } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/types/products";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { fontStack } from "@repo/ui/lib/font-stack";
import { Alexandria, IBM_Plex_Sans_Arabic, Jost } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import "./../globals.css";

/**
 * Two families, both carrying Arabic *and* Latin — so neither script falls
 * back to a different face mid-sentence, which is what switching Almarai
 * for Roboto by locale did.
 *
 * The old setup loaded Almarai at weight 400 and nothing else. With one
 * weight there is no hierarchy a heading can have over its paragraph; the
 * ranges below are what the type scale needs.
 *
 * next/font fails the build if a requested subset does not exist, so the
 * "arabic" in each list is checked every time this compiles — not assumed.
 */
/**
 * Display: Jost for Latin — the face of the approved datasheet and
 * quotation, so the site, the admin and the documents set their titles in
 * one voice — with Alexandria for Arabic, a geometric Arabic drawn as a
 * companion to exactly this kind of Futura-lineage Latin. Jost has no Arabic
 * glyphs, so the stack order does the switching (see fontStack).
 * Light to medium only, as in the documents: no bold display type.
 */
const displayLatin = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const displayArabic = Alexandria({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const DISPLAY_STACK = fontStack(displayLatin, displayArabic);

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

type LayoutParams = Promise<{ locale: string }>

// `locale` sets `<html lang/dir>` before anything else renders, so it can't
// move behind Suspense — this layout blocks instead of sharing a prefetch.
export const instant = false;

/** Both locales are known at build time, so every route can prerender a shell. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// From the root param, not `params`: awaiting `params` here waits on the
// whole route's params, and a catch-all's cannot be known at build time.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootLocale();
  return constructMetadata({
    locale: locale as SupportedLanguage,
  });
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LayoutParams;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Lets next-intl read the locale from here instead of the request
  // headers, which would make every page render per request.
  setRequestLocale(locale);

  // Only what Client Components use; the rest renders on the server.
  const messages = pickClientMessages(await getMessages());

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <body
        className={cn(
          // No bg-muted/30 here: a translucent tint over the ground token is
          // why the background computed to 30% opacity instead of the surface.
          "antialiased overflow-x-hidden",
          body.variable,
        )}
        style={{ "--font-display-face": DISPLAY_STACK } as React.CSSProperties}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
          {/* Offset clears the cart sheet's header and close button, which a toast at
              the very top covered; same inset on mobile. */}
          <Toaster offset={{ top: 88 }} mobileOffset={{ top: 88 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}