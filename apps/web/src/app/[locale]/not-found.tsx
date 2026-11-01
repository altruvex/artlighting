import { Onward } from "@/components/editorial/arrow";
import { Link } from "@/i18n/navigation";
import { SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

/**
 * A missing page.
 *
 * It searched as you typed through a client-side copy of the product
 * list and linked "All products" to /category — itself a redirect. Now it
 * is a plain form that lands on the shop's own search, which works before
 * any JavaScript loads, and three ways back into the site.
 */
export default function NotFound() {
  const t = useTranslations("not-found");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col px-4 py-10 sm:px-6 lg:px-10">
      <Link href="/" className="w-fit" aria-label={tNav("home")}>
        <Image src={locale === "ar" ? "/logo-ar.png" : "/logo-en.png"} alt="" width={56} height={56} className="size-14" />
      </Link>
      <div className="my-auto max-w-2xl py-20">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-[length:var(--text-4xl)] font-medium leading-[1.05] ltr:tracking-tight rtl:leading-[1.3]">{t("title")}</h1>
        <p className="lede mt-6">{t("description")}</p>

        <form action={`/${locale}/products`} method="get" role="search" className="mt-10 flex max-w-xl gap-2">
          <label htmlFor="nf-search" className="sr-only">{t("placeholder")}</label>
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="nf-search"
              name="q"
              type="search"
              placeholder={t("placeholder")}
              className="h-12 w-full rounded-md border border-input bg-background ps-10 pe-3 outline-none transition-[border-color,box-shadow] duration-[var(--dur-hover)] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <button type="submit" className="h-12 shrink-0 rounded-md bg-primary px-5 font-semibold text-primary-foreground transition-[transform,background-color] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]">
            {t("search")}
          </button>
        </form>

        <ul className="mt-12 border-t border-border">
          {[
            { href: "/products", label: t("all-products") },
            { href: "/applications", label: tNav("applications") },
            { href: "/contact-us", label: t("contact-us") },
          ].map((link) => (
            <li key={link.href} className="border-b border-border">
              <Link href={link.href} className="group flex items-center justify-between py-4 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary">
                {link.label}
                <Onward className="text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
