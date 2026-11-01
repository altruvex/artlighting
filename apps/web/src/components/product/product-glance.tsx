import type { LocalizedSpecGroup } from "@/lib/specs-view";

/** The figures a shopper compares fixtures by, in the order they compare them. */
const GLANCE_KEYS = ["maximumWattage", "luminousFlux", "colorTemperature", "beamAngle", "cri", "ip", "lifeTime", "energySaving"];

/**
 * The key figures, large, before the full sheet.
 *
 * This replaces a "Features" list of nine marketing sentences — "Weatherproof
 * Warrior", "Climate Conqueror" — each with a spec value dropped into it, so
 * a product missing a value read "lasting  times longer", and three of them
 * promised things (no tools needed, shock-proof) nothing in the catalogue
 * says. What is shown now is exactly what the catalogue records, labelled
 * as the catalogue labels it.
 */
export default function ProductGlance({ groups }: { groups: LocalizedSpecGroup[] }) {
  const byKey = new Map(groups.flatMap((group) => group.items).filter((item) => item.key).map((item) => [item.key!, item]));
  const tiles = GLANCE_KEYS.flatMap((key) => {
    const item = byKey.get(key);
    return item && item.value.trim() ? [item] : [];
  }).slice(0, 6);

  if (tiles.length < 2) return null;

  return (
    <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
      {tiles.map((item) => (
        <div key={item.key} className="flex flex-col justify-between gap-3 border-b border-border py-5 pe-4 sm:border-b-0 sm:border-e sm:ps-5 sm:first:ps-0 sm:last:border-e-0">
          <dt className="text-[length:var(--text-xs)] text-muted-foreground">{item.label}</dt>
          {/* One line per figure, each isolated: "٣٠٠٠ كلفن" reads right to
              left and "1,320 lm" left to right, and a single run of both
              would let bidi reorder one into the other. */}
          <dd className="font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-medium leading-snug tabular-nums">
            {(item.parts.length > 0 ? item.parts : [{ text: item.value }]).map((part, index) => (
              <bdi key={index} className="block">
                {part.text}
                {"condition" in part && part.condition && (
                  <span className="ms-1.5 whitespace-nowrap text-[length:var(--text-xs)] font-normal text-muted-foreground">{part.condition}</span>
                )}
              </bdi>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
