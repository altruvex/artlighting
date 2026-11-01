import { BanknoteIcon, HeadsetIcon, TruckIcon, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * The promises the shop already makes, stated once.
 *
 * "Fast shipping" used to sit on every one of 117 product cards; the
 * features section spelled the real promise out further down the page —
 * four working days, cash on delivery. Both are said here, once, where a
 * shopper looks before committing, and nothing is added that the business
 * has not already promised: no warranty or return window that is not
 * written anywhere else.
 */
export async function TrustStrip({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.trust" });
  const tCta = await getTranslations({ locale, namespace: "cta" });

  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: TruckIcon, title: t("delivery.title"), body: t("delivery.body") },
    { icon: BanknoteIcon, title: t("cod.title"), body: t("cod.body") },
    { icon: HeadsetIcon, title: t("support.title"), body: tCta("workingHours") },
  ];

  return (
    <section aria-label={t("label")} className="border-y border-border">
      <ul className="mx-auto grid max-w-screen-2xl px-4 sm:grid-cols-3 sm:px-6 lg:px-10">
        {items.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className={`flex items-start gap-4 py-7 ${index > 0 ? "border-t border-border sm:border-t-0 sm:border-s sm:ps-8" : "sm:pe-8"}`}>
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{title}</p>
              <p className="text-[length:var(--text-sm)] text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
