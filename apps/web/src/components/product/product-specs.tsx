import type { LocalizedSpecGroup } from "@/lib/specs-view";
import { Fragment } from "react";

/**
 * The spec sheet.
 *
 * Grouped as the catalogue groups it, one card per group, each a
 * description list: a label and its value, not a two-column table whose
 * header row said "Specification | Value" over every group. The two brand
 * pages built their own flat tables from hard-coded labels, and each
 * showed a different subset; this reads whatever the product has.
 *
 * `dir="auto"` on the figures: "1,320 lm" is a number followed by a Latin
 * symbol, and bidi reordering would move the unit away from it.
 */
export default function ProductSpecs({
  groups,
  hNumber,
  locale,
  armsLabel,
}: {
  groups: LocalizedSpecGroup[];
  hNumber?: number | null;
  locale: string;
  armsLabel: string;
}) {
  const ar = locale === "ar";
  // A product with no spec groups still states its arm count, which lives
  // on the product rather than in the specs.
  const sheet: LocalizedSpecGroup[] =
    groups.length > 0
      ? groups
      : [
          {
            name: "",
            items: hNumber
              ? [{ key: "hNumber", label: armsLabel, value: String(hNumber), parts: [{ text: hNumber.toLocaleString(ar ? "ar-EG" : "en") }], numeric: hNumber }]
              : [],
          },
        ];

  const visible = sheet.filter((group) => group.items.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visible.map((group, index) => (
        <section
          key={group.name || index}
          aria-label={group.name || undefined}
          className={visible.length === 1 ? "md:col-span-2" : undefined}
        >
          <div className="h-full rounded-2xl border border-border bg-card/50 p-5">
            {group.name && (
              <h3 className="mb-3 text-[length:var(--text-sm)] font-semibold text-primary">{group.name}</h3>
            )}
            <dl className={visible.length === 1 ? "grid gap-x-10 md:grid-cols-2" : undefined}>
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-border/70 py-2.5 last:border-b-0"
                >
                  <dt className="text-[length:var(--text-sm)] text-muted-foreground">{item.label}</dt>
                  <dd className="text-[length:var(--text-sm)] font-medium">
                    <SpecValue item={item} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ))}
    </div>
  );
}

function SpecValue({ item }: { item: LocalizedSpecGroup["items"][number] }) {
  const hasConditions = item.parts.some((part) => part.condition);
  // A figure measured at a condition is its own <dt>/<dd> pair, so a
  // screen reader hears which temperature a reading belongs to.
  if (hasConditions) {
    return (
      <dl className="grid w-fit grid-cols-[auto_1fr] gap-x-3 gap-y-0.5" dir="auto">
        {item.parts.map((part) => (
          <Fragment key={`${part.condition}-${part.text}`}>
            <dt className="text-[length:var(--text-xs)] tabular-nums text-muted-foreground self-center">{part.condition}</dt>
            <dd className="tabular-nums">{part.text}</dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  if (item.parts.length > 1) {
    return (
      <ul className="flex flex-wrap gap-1.5" dir="auto">
        {item.parts.map((part, index) => (
          <li key={`${index}-${part.text}`} className="rounded-md border border-border px-2 py-0.5 text-[length:var(--text-xs)] tabular-nums">
            {part.text}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <span className="tabular-nums" dir="auto">
      {item.parts[0]?.text ?? item.value}
    </span>
  );
}
