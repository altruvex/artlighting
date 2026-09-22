import { SECTION_FRAME } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { SHOWROOM_MAP, SHOWROOM_PHONE, SHOWROOM_WHATSAPP } from "@/lib/showroom";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

/**
 * The last thing a page offers before the footer: a person.
 *
 * The old call to action said "Illuminate your world", sent "Shop all
 * collections" to /collections — a page that does not exist — and had been
 * dropped from every page anyway. Lighting is bought by the room, and the
 * showroom's real service is looking at the room: so the one thing asked
 * of the shopper is a photo on WhatsApp, with a call and the address as the
 * other two ways in.
 */
export async function ClosingCta({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "closingCta" });
  const tCta = await getTranslations({ locale, namespace: "cta" });

  return (
    <section aria-labelledby="closing-cta-heading" className={`${SECTION_FRAME} py-12 lg:py-20`}>
      <div className="relative isolate overflow-hidden rounded-3xl border border-border">
        <Image
          src="/misterled-landing/landing-2.png"
          alt=""
          fill
          // Half of it sits under the solid end of the veil, so it never
          // needs more than the viewport's width — not the 3840px a
          // full-bleed "100vw" asks for on a retina screen.
          sizes="(min-width: 1024px) 60vw, 100vw"
          quality={60}
          className="-z-20 object-cover object-[50%_30%]"
        />
        {/* Solid where the text sits, clearing towards the photograph — on
            the start side, so it follows the reading direction. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/90 to-background/40 sm:bg-linear-to-r sm:from-background sm:via-background/85 sm:to-background/10 rtl:sm:bg-linear-to-l"
        />
        <div className="max-w-xl space-y-6 px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <div className="space-y-3">
            <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-primary">{t("eyebrow")}</p>
            <h2
              id="closing-cta-heading"
              className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-semibold leading-[1.1] tracking-tight text-balance"
            >
              {t("title")}
            </h2>
            <p className="text-pretty leading-relaxed text-muted-foreground">{t("body")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 text-base">
              <a href={SHOWROOM_WHATSAPP} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" aria-hidden />
                {t("whatsapp")}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 bg-background/60 text-base backdrop-blur">
              <a href={`tel:${SHOWROOM_PHONE}`}>
                <Phone className="size-5" aria-hidden />
                {t("call")}
              </a>
            </Button>
          </div>

          <dl className="grid gap-3 border-t border-border/70 pt-5 text-[length:var(--text-sm)] sm:grid-cols-2">
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="sr-only">{t("visit")}</dt>
                <dd>
                  <a
                    href={SHOWROOM_MAP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline"
                  >
                    {tCta("address")}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="sr-only">{t("hours")}</dt>
                <dd className="text-muted-foreground">{tCta("workingHours")}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
