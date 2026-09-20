import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/types/products";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
import { notFound } from "next/navigation";
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
const display = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

type LayoutParams = Promise<{ locale: string }>

export async function generateMetadata(
  { params }: { params: LayoutParams }
): Promise<Metadata> {
  const { locale } = await params;

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

  const messages = await getMessages();

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
          display.variable,
          body.variable,
        )}
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
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}