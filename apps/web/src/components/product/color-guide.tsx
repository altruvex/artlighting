import { useTranslations } from "next-intl";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** "٣٠٠٠ K / ٦٥٠٠ K" → "3000K/6500K": the digits in either script, nothing else. */
function kelvinText(raw: string) {
  return [...raw]
    .map((character) => {
      const index = ARABIC_DIGITS.indexOf(character);
      return index >= 0 ? String(index) : character;
    })
    .join("")
    .replace(/[,٬⁦-⁩‎‏\s]/g, "");
}

const SWATCH = { warm: "bg-[#F6C77A]", white: "bg-[#F4EFE3]", cool: "bg-[#D6E6F7]" } as const;

/**
 * Which colour temperature suits which room — for the temperatures this
 * product actually comes in.
 *
 * Matching on the digits, in either script: the old check was
 * `includes("3000K")` against a value that reads "٣٠٠٠ K" in Arabic, so
 * this never rendered on an Arabic page.
 */
export default function ColorGuide({ colorTemperature }: { colorTemperature?: string }) {
  const t = useTranslations("colorTemperature");
  const tPdp = useTranslations("pdp");
  const normalized = kelvinText(colorTemperature ?? "");

  const cards = [
    normalized.includes("3000") && {
      temp: "warm" as const,
      kelvin: "3000K",
      lines: [`${t("warm.notRecommended")}: ${t("warm.notRecommendedDesc")}`, t("warm.desc")],
    },
    normalized.includes("4000") && {
      temp: "white" as const,
      kelvin: "4000K",
      lines: [t("cool.boost"), t("cool.decor"), t("cool.energy")],
      // The messages file keeps 4000 K's copy under "cool" and 6500 K's
      // under "white" — the reverse of the catalogue, where white is 4000 K
      // and cool 6500 K. The title follows the catalogue, so it matches the
      // option the customer picks above.
      title: t("white.title"),
    },
    normalized.includes("6500") && {
      temp: "cool" as const,
      kelvin: "6500K",
      lines: [`${t("white.recommended")} ${t("white.recommendedDesc")}`, t("white.desc")],
      title: t("cool.title"),
    },
  ].filter(Boolean) as { temp: keyof typeof SWATCH; kelvin: string; lines: string[]; title?: string }[];

  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="color-guide-heading" className="space-y-4">
      <div className="space-y-1">
        <h3 id="color-guide-heading" className="text-[length:var(--text-lg)] font-semibold">
          {tPdp("colorGuide")}
        </h3>
        <p className="text-[length:var(--text-sm)] text-muted-foreground">{tPdp("colorGuideSub")}</p>
      </div>
      <ul className="border-t border-border">
        {cards.map((card) => (
          <li key={card.temp} className="flex gap-4 border-b border-border py-5">
            <span aria-hidden className={`mt-1 size-8 shrink-0 rounded-full ring-1 ring-foreground/15 ${SWATCH[card.temp]}`} />
            <div className="min-w-0 space-y-1.5">
              <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                {card.title ?? t(`${card.temp}.title`)}
                <span dir="ltr" className="text-[length:var(--text-xs)] font-medium tabular-nums text-muted-foreground">
                  {card.kelvin}
                </span>
              </p>
              <ul className="space-y-1 text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
                {card.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
