"use client";

import { useTranslations } from "next-intl";

interface SpecificationsTable {
  [key: string]: string;
  "Color Temperature": string;
}

interface ColorTemperatureSectionProps {
  specificationsTable: SpecificationsTable;
  /** Spec values by language-neutral key; see ProductFeatures. */
  specs?: Record<string, string>;
}

export default function ColorTemperatureSection({
  specificationsTable,
  specs,
}: ColorTemperatureSectionProps) {
  const t = useTranslations("colorTemperature");

  /**
   * The old check was `includes("3000K")` against a string that reads
   * "٣٠٠٠ K" in Arabic, so this whole section never rendered on an Arabic
   * page. Matching on the digits — in either script — is what the value
   * actually is.
   */
  const raw = specs?.colorTemperature ?? specificationsTable["Color Temperature"] ?? "";
  const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const normalized = [...raw]
    .map((character) => {
      const index = ARABIC_DIGITS.indexOf(character);
      return index >= 0 ? String(index) : character;
    })
    .join("")
    .replace(/[,\u066c\u2066-\u2069\u200e\u200f\s]/g, "");
  const has = (kelvin: string) => normalized.includes(kelvin);

  return (
    <div>
      {has("3000") && (
        <ul>
          <p className="text-xl tracking-wide my-2">
            <strong>{t("warm.title")}</strong>
          </p>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            <strong>{t("warm.notRecommended")}</strong> : {t("warm.notRecommendedDesc")}
          </li>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            {t("warm.desc")}
          </li>
        </ul>
      )}

      {has("4000") && (
        <ul>
          <p className="text-xl tracking-wide my-2">
            <strong>{t("cool.title")}</strong>
          </p>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            {t("cool.boost")}
          </li>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            {t("cool.decor")}
          </li>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            {t("cool.energy")}
          </li>
        </ul>
      )}

      {has("6500") && (
        <ul>
          <p className="text-xl tracking-wide my-2">
            <strong>{t("white.title")}</strong>
          </p>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            <strong>{t("white.recommended")}</strong> : {t("white.recommendedDesc")}
          </li>
          <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
            {t("white.desc")}
          </li>
        </ul>
      )}
    </div>
  );
}
