import { Provider } from "@/components/providers";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { localeDirection } from "@/i18n/config";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { fontStack } from "@repo/ui/lib/font-stack";
import { Alexandria, IBM_Plex_Sans_Arabic, Jost } from "next/font/google";
import "./globals.css";
import { SkipToContent } from "@/components/shell/skip-to-content";

/**
 * The storefront's families, so the admin reads as the same company. The
 * body is IBM Plex Sans Arabic, which carries Arabic *and* Latin, so a
 * mixed-script string (an Arabic product name with a Latin SKU) stays in one
 * face; it is a UI face with tabular figures, which the tables lean on.
 * Titles and KPI figures are set in Jost (the documents' face) with
 * Alexandria for Arabic — see the web layout for why that pair.
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = localeDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${body.variable} font-sans antialiased overflow-x-hidden scroll-smooth`}
        style={{ "--font-display-face": DISPLAY_STACK } as React.CSSProperties}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <SkipToContent />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Provider dir={dir}>{children}</Provider>
          </ThemeProvider>
          <Toaster dir={dir} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
