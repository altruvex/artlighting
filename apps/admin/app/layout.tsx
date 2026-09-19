import { Provider } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { localeDirection } from "@/i18n/config";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Noto_Sans_Arabic, Roboto } from "next/font/google";
import "./globals.css";
import { SkipToContent } from "@/components/shell/skip-to-content";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  display: "swap",
});

/**
 * One font stack for both UI languages and for mixed-script strings:
 * Roboto (served for Latin code points only) first, then Noto Sans Arabic
 * (Arabic code points only), then next/font's metric-adjusted fallbacks,
 * then system fonts. The fallbacks must come AFTER both real faces: they are
 * local Arial, which has Arabic glyphs, so in front of Noto they would
 * silently render all Arabic text in Arial. Built from next/font's own
 * family names so it holds whatever names the bundler generates.
 */
function fontStack(...fonts: { style: { fontFamily: string } }[]) {
  const families = fonts.map((f) => f.style.fontFamily.split(",").map((name) => name.trim()));
  return [
    ...families.map((names) => names[0]),
    ...families.flatMap((names) => names.slice(1)),
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ].join(", ");
}

const FONT_STACK = fontStack(roboto, notoSansArabic);

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
        className="font-sans antialiased overflow-x-hidden scroll-smooth"
        style={{ "--font-stack": FONT_STACK } as React.CSSProperties}
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
