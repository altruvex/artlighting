/**
 * One CSS font-family list from several next/font faces, in order: every
 * face's real family first, then all of their metric-adjusted fallbacks,
 * then system fonts.
 *
 * The order is the point. next/font's fallback for a face is local Arial,
 * which HAS Arabic glyphs — so a list of `var(--font-a), var(--font-b)`
 * (each variable carrying its own fallback) puts Arial ahead of the Arabic
 * face and every Arabic heading silently renders in Arial. Jost, the Latin
 * display face, carries no Arabic at all, so without this the Arabic
 * companion would never be reached.
 */
export function fontStack(...fonts: { style: { fontFamily: string } }[]): string {
  const families = fonts.map((font) => font.style.fontFamily.split(",").map((name) => name.trim()))
  return [
    ...families.map((names) => names[0]),
    ...families.flatMap((names) => names.slice(1)),
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ].join(", ")
}
