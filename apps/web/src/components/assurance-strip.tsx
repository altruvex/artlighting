import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { STORE_TERMS } from "@/content/policies";
import { BadgeCheckIcon, RotateCcwIcon, TruckIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Delivery, returns and certification, one quiet line under the header.
 *
 * Each item states only what is on record — the delivery time and cash on
 * delivery the checkout promises, the return window in STORE_TERMS, the
 * approval letters and certificates on the About page — and links to the
 * page that says the rest. No delivery price: outside Cairo it is confirmed
 * per order. It scrolls away with the page; the header stays sticky alone.
 */
export async function AssuranceStrip() {
  const t = await getTranslations("assurance");
  const locale = await getLocale();
  const n = (value: number) => value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const items = [
    { href: "/shipping", Icon: TruckIcon, title: t("shipping", { days: n(STORE_TERMS.deliveryWorkingDays) }), short: t("shippingShort", { days: n(STORE_TERMS.deliveryWorkingDays) }), detail: t("shippingDetail") },
    { href: "/returns", Icon: RotateCcwIcon, title: t("returns", { days: n(STORE_TERMS.returnDays) }), detail: t("returnsDetail") },
    { href: "/about-us#documents", Icon: BadgeCheckIcon, title: t("certified"), detail: t("certifiedDetail") },
  ];

  return (
    <aside aria-label={t("label")} className="border-b border-border/70 bg-muted/40">
      <Container>
        <ul className="grid grid-cols-3 divide-x divide-border/70 rtl:divide-x-reverse">
          {items.map(({ href, Icon, title, short, detail }: { href: string; Icon: typeof TruckIcon; title: string; short?: string; detail: string }) => (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                prefetch={false}
                className="group flex h-10 items-center justify-center gap-2 px-1 text-[length:var(--text-xs)] sm:px-3 sm:text-[length:var(--text-sm)]"
              >
                <Icon className="hidden size-4 shrink-0 text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-primary sm:block" aria-hidden />
                <span className="truncate font-medium transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                  {/* A phone has a third of 375px per item: the short form fits it. */}
                  {short ? (
                    <>
                      <span className="sm:hidden">{short}</span>
                      <span className="hidden sm:inline">{title}</span>
                    </>
                  ) : (
                    title
                  )}
                </span>
                <span className="hidden truncate text-muted-foreground xl:inline">· {detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </aside>
  );
}
