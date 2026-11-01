/** A string written in both languages, side by side, so neither is an afterthought. */
export type L = { en: string; ar: string };

export function pick(value: L, locale: string): string {
  return locale === "ar" ? value.ar : value.en;
}

export function pickList(values: readonly L[], locale: string): string[] {
  return values.map((value) => pick(value, locale));
}
