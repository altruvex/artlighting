import { Onward } from "@/components/editorial/arrow";
import { Check } from "lucide-react";
import { applicationsForType } from "@/content/applications";
import { pick } from "@/content/l10n";
import { FAMILY_INTRO, LIGHTING_TYPES } from "@/content/lighting-types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { setParam, type ShopParams } from "@/lib/shop-url";
import type { Facet } from "@/lib/shop.server";
import type { ProductFamily } from "@repo/catalog/families";
import { getTranslations } from "next-intl/server";

/**
 * A family, introduced as a system rather than a grid.
 *
 * When the shop is narrowed to one family, it opens with what that family
 * is for and — for the architectural families — each lighting type in it
 * with the job it does, so "COB", "linear" and "wall washer" mean
 * something before the products do. Each type is a filter link that keeps
 * the rest of the query. Only types with products in the current results
 * are listed; the applications line points to the spaces the family serves.
 */
export async function FamilyIntro({
  family,
  locale,
  params,
  typeFacets,
  activeTypes,
}: {
  family: ProductFamily;
  locale: string;
  params: ShopParams;
  typeFacets: Facet[];
  activeTypes: string[];
}) {
  const t = await getTranslations({ locale, namespace: "shop" });
  const intro = FAMILY_INTRO[family];
  const counts = new Map(typeFacets.map((facet) => [facet.value, facet.count]));
  const types = LIGHTING_TYPES.filter((type) => type.family === family && (counts.get(type.id) ?? 0) > 0);
  const chosen = types.filter((type) => activeTypes.includes(type.id));
  const applications = [
    ...new Map(
      (types.length ? types.flatMap((type) => applicationsForType(type.id)) : applicationsForType(null, family)).map((application) => [
        application.slug,
        application,
      ]),
    ).values(),
  ];

  return (
    <section aria-label={pick(intro.title, locale)} className="border-b border-border py-8">
      <p className="max-w-3xl text-pretty text-muted-foreground">{pick(intro.body, locale)}</p>

      {types.length > 0 && (
        // Filter buttons that look like buttons. A quiet row of names with
        // rules over them read as headings, not as something to press —
        // on a phone especially. These are the shape every shop uses for a
        // filter: a bordered button, the chosen one filled with a tick, all
        // of them visible (they wrap rather than scroll, so the chosen one
        // is never off the edge). The chosen type's job is spelled out
        // underneath.
        <div className="mt-8">
          <p id="shop-by-type" className="text-[length:var(--text-sm)] font-medium">
            {t("shopByType")}
          </p>
          <ul aria-labelledby="shop-by-type" className="mt-3 flex flex-wrap gap-2">
            <li>
              <TypeChip href={setParam(params, "type", null)} active={activeTypes.length === 0} name={t("allTypes")} />
            </li>
            {types.map((type) => {
              const active = activeTypes.includes(type.id);
              return (
                <li key={type.id}>
                  <TypeChip
                    href={setParam(params, "type", active ? null : type.id)}
                    active={active}
                    name={pick(type.name, locale)}
                    count={counts.get(type.id)}
                  />
                </li>
              );
            })}
          </ul>
          {chosen.length > 0 && (
            <div className="mt-4 space-y-1">
              {chosen.map((type) => (
                <p key={type.id} className="max-w-3xl text-[length:var(--text-sm)] text-pretty text-muted-foreground">
                  <span className="font-medium text-foreground">{pick(type.name, locale)}</span>
                  {" — "}
                  {pick(type.purpose, locale)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {applications.length > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[length:var(--text-sm)]">
          <span className="font-medium">{t("usedIn")}</span>
          {applications.map((application) => (
            <Link
              key={application.slug}
              href={`/applications/${application.slug}`}
              className="group inline-flex min-h-10 items-center gap-1.5 text-muted-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline sm:min-h-0"
            >
              {pick(application.name, locale)}
              <Onward className="size-3.5" />
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}

function TypeChip({ href, active, name, count }: { href: string; active: boolean; name: string; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3.5 text-[length:var(--text-sm)] font-medium whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.98]",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-foreground hover:border-foreground/40 hover:bg-accent",
      )}
    >
      {active && <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.25} />}
      {name}
      {count !== undefined && (
        <span className={cn("text-[length:var(--text-xs)] tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </Link>
  );
}
