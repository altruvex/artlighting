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
import { IBM_Plex_Sans_Arabic, Jost } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import "./../globals.css";

// One Arabic family across headings and controls keeps mixed-script shopping
// screens consistent. Jost provides the Latin display face.
const displayLatin = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

type LayoutParams = Promise<{ locale: string }>;

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
      lang={locale === "ar" ? "ar-EG" : "en"}
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
        style={
          {
            "--font-display-face":
              locale === "ar"
                ? body.style.fontFamily
                : displayLatin.style.fontFamily,
          } as React.CSSProperties
        }
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
