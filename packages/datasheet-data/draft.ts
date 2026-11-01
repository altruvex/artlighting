import { prisma } from "@repo/database";
import { formatSpecValue } from "@repo/catalog";
import { describeProduct } from "@repo/catalog/describe";
import { bulbChoices } from "@repo/catalog/bulb-pricing";
import { IntlMessageFormat } from "intl-messageformat";
import webMessages from "../../apps/web/messages/en/catalog.json" with { type: "json" };
import type { DatasheetProductData, ImageRef } from "@repo/datasheet";
import { BRAND_LOGOS } from "@repo/datasheet";
import { assignImageSlots, resolveImageUrl } from "./resolve-images";
import { mapDraft, type DatasheetDraft, type DraftImageOption, type DraftRow, type DraftSection, type SectionGroupTarget } from "./draft-core";

export type { DatasheetDraft, DraftImageOption, DraftRow, DraftRowSource, DraftSection, SectionGroupTarget } from "./draft-core";

/**
 * A datasheet before it becomes a file: every word the page prints, each row
 * remembering where it came from. The studio edits this; the export renders
 * it; and "save to the product" uses the sources to write each change back
 * to exactly the spec it was read from. Plain JSON, safe to hand to a client.
 *
 * Specs are read from the structured SpecGroups — what the product page
 * shows — never from the legacy ProductSpecification columns, which the
 * Phase 2 split left behind with the bugs it fixed (a driver "internal" in
 * English and "external" in Arabic, lifetimes without their unit).
 */

type SectionKey = "key" | "electrical" | "source" | "mechanical" | "environmental";

/**
 * Where each known spec sits on the sheet, and what the sheet calls it — in
 * the vocabulary of a technical luminaire data sheet ("Correlated color
 * temperature", "Protection class"). The "key" section is the headline table
 * beside the photo; the rest are the grouped TECHNICAL DATA tables.
 */
const PLACEMENT: Record<string, { section: SectionKey; label: string; highlight?: boolean }> = {
  maximumWattage: { section: "key", label: "Power (P)" },
  luminousFlux: { section: "key", label: "Luminous flux" },
  colorTemperature: { section: "key", label: "Correlated color temperature" },
  cri: { section: "key", label: "Color rendering index" },
  beamAngle: { section: "key", label: "Beam angle" },
  ip: { section: "key", label: "Protection class" },
  lifeTime: { section: "key", label: "Rated lifetime" },
  input: { section: "electrical", label: "Input voltage" },
  powerFactor: { section: "electrical", label: "Power factor" },
  electrical: { section: "electrical", label: "Driver" },
  fixtureDimmable: { section: "electrical", label: "Dimming" },
  energySaving: { section: "electrical", label: "Energy saving" },
  brandOfLed: { section: "source", label: "LED chips" },
  lampBase: { section: "source", label: "Lamp base" },
  bulb: { section: "source", label: "Bulb included" },
  mainMaterial: { section: "mechanical", label: "Housing" },
  finish: { section: "mechanical", label: "Finish" },
  workingTemperature: { section: "environmental", label: "Operating temperature" },
};

/** Row order within each section. */
const ORDER = Object.keys(PLACEMENT);

const SECTION_META: Record<SectionKey, { title: string; target: SectionGroupTarget }> = {
  key: { title: "Luminaire data", target: "optical" },
  electrical: { title: "Electrical", target: "electrical" },
  source: { title: "Light source", target: "optical" },
  mechanical: { title: "Mechanical", target: "physical" },
  environmental: { title: "Environmental", target: "physical" },
};

/** Every figure carrying this unit in a formatted value ("14,600 lm (3,000 K)" → [14600]). */
function figure(text: string, unit: string): number[] {
  return [...text.matchAll(new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s*${unit}(?![/\\w])`, "g"))].map((m) => Number(m[1]!.replace(/,/g, "")));
}

/**
 * Luminous efficacy, only when it can be stated plainly: one wattage, and a
 * flux that is the same figure at every colour temperature. Anything else
 * (a strip's lm/m, fluxes that differ by CCT) says nothing rather than a
 * number the product's own specs do not support.
 */
function efficacy(watts: string | undefined, flux: string | undefined): string | null {
  if (!watts || !flux) return null;
  const w = figure(watts, "W");
  const lm = figure(flux, "lm");
  if (w.length !== 1 || !w[0] || lm.length === 0 || lm.some((v) => v !== lm[0])) return null;
  return `${(lm[0]! / w[0]).toFixed(1)} lm/W`;
}

const DRAFT_INCLUDE = {
  category: true,
  lightingtype: { include: { translations: { where: { language: "en" } } } },
  translations: { where: { language: "en" } },
  images: { orderBy: { order: "asc" as const } },
  bulbs: { include: { bulb: { include: { translations: { where: { language: "en" } } } } } },
  specGroups: {
    orderBy: { position: "asc" as const },
    include: {
      translations: { where: { language: "en" } },
      items: {
        orderBy: { position: "asc" as const },
        include: {
          measurements: { orderBy: { position: "asc" as const } },
          option: { include: { translations: { where: { language: "en" } } } },
          translations: { where: { language: "en" } },
        },
      },
    },
  },
};

const t = webMessages["product-description"];

/**
 * The product page's own English description, word for word: the same
 * clauses (@repo/catalog describeProduct) through the same message strings
 * the storefront renders them with.
 */
function renderDescription(clauses: ReturnType<typeof describeProduct>): string {
  const lookup = (key: string): string | undefined =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], t) as
      | string
      | undefined;
  const parts = clauses
    .map((clause) => {
      const template = lookup(clause.key);
      if (!template) return "";
      const params: Record<string, string | number> = { ...(clause.params ?? {}) };
      for (const [name, value] of Object.entries(clause.params ?? {})) {
        if (typeof value === "number") params[`${name}Text`] = value.toLocaleString("en-US");
      }
      if ("type" in params && !String(params.type).trim()) params.type = t.fixture;
      return String(new IntlMessageFormat(template, "en").format(params)).trim();
    })
    .filter(Boolean);
  return parts.length ? parts.join(t.join) + t.end : "";
}

export async function getDatasheetDraft(
  productId: string
): Promise<{ draft: DatasheetDraft; imageOptions: DraftImageOption[] } | null> {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: DRAFT_INCLUDE });
  if (!p) return null;

  const specsByKey: Record<string, string> = {};
  const buckets: Record<SectionKey, DraftRow[]> = { key: [], electrical: [], source: [], mechanical: [], environmental: [] };
  const extra = new Map<string, DraftRow[]>();
  const rank = new Map<string, number>();

  for (const group of p.specGroups) {
    for (const item of group.items) {
      const value = formatSpecValue(
        {
          kind: item.kind as never,
          unit: item.unit,
          comparator: item.comparator as never,
          measurements: item.measurements.map((m) => ({
            value: m.value.toString(),
            valueMax: m.valueMax?.toString() ?? null,
            conditionValue: m.conditionValue?.toString() ?? null,
            conditionUnit: m.conditionUnit,
          })),
          optionLabel: item.option?.translations[0]?.label ?? null,
          text: item.translations[0]?.value ?? null,
        },
        "en"
      );
      if (!value || value === "—") continue;
      if (item.key) specsByKey[item.key] = value;
      // The storefront's table prints the bare figure beside its label; the
      // sheet prints "IP 65", as the reference does.
      const shown = item.key === "ip" && /^\d+$/.test(value) ? `IP ${value}` : value;

      const placement = item.key ? PLACEMENT[item.key] : undefined;
      const label = placement?.label ?? item.translations[0]?.label ?? item.key ?? "";
      const row: DraftRow = {
        id: item.id,
        ...(item.key ? { key: item.key } : {}),
        label,
        value: shown,
        highlight: placement?.highlight ?? false,
        source: { kind: "spec", itemId: item.id },
        original: { label, value: shown },
      };
      if (placement) {
        rank.set(row.id, ORDER.indexOf(item.key!));
        buckets[placement.section].push(row);
      }
      else {
        // A spec the sheet has no slot for keeps its own group as a section.
        const title = group.translations[0]?.name ?? "Specifications";
        extra.set(title, [...(extra.get(title) ?? []), row]);
      }
    }
  }

  const byOrder = (a: DraftRow, b: DraftRow) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99);
  buckets.key.sort(byOrder);
  const lumens = efficacy(specsByKey.maximumWattage, specsByKey.luminousFlux);
  if (lumens) {
    const at = buckets.key.findIndex((row) => row.source.kind === "spec" && rank.get(row.id) === ORDER.indexOf("luminousFlux"));
    buckets.key.splice(at >= 0 ? at + 1 : buckets.key.length, 0, {
      id: "derived:efficacy",
      key: "efficacy",
      label: "Luminous efficacy",
      value: lumens,
      highlight: false,
      source: { kind: "derived" },
    });
  }

  const sections: DraftSection[] = (Object.keys(SECTION_META) as SectionKey[])
    .map((key) => ({
      id: key,
      title: SECTION_META[key].title,
      target: SECTION_META[key].target,
      rows: key === "key" ? buckets[key] : buckets[key].sort(byOrder),
    }))
    .filter((s) => s.rows.length > 0);
  // A spec the sheet has no slot for keeps its own group, after the known ones.
  sections.push(
    ...[...extra].map(([title, rows], i) => ({ id: `extra-${i}`, title, target: "custom" as const, rows })),
  );

  const family = p.sectionType as "INDOOR" | "OUTDOOR" | "CHANDELIER";
  const generated = renderDescription(
    describeProduct(
      {
        family,
        lightingTypeName: p.lightingtype.translations[0]?.name ?? p.lightingtype.name,
        hNumber: p.hNumber,
        bulbChoices: bulbChoices(p.bulbs as never, p.hNumber, "en"),
        specs: specsByKey,
      },
      "short"
    )
  );
  const authored = p.translations[0]?.description?.trim() || "";
  const description = authored || generated;

  const slots = assignImageSlots(p.images);
  const lightingType = p.lightingtype.translations[0]?.name ?? p.lightingtype.name;
  const familyLabel = { INDOOR: "Indoor", OUTDOOR: "Outdoor", CHANDELIER: "Chandelier" }[family] ?? "";

  return {
    draft: {
      productId: p.id,
      productCode: p.productId.toUpperCase(),
      categoryLabel: categoryLabel(family, lightingType, familyLabel),
      description,
      originalDescription: description,
      descriptionIsAuthored: Boolean(authored),
      sections,
      images: {
        photoId: slots.photo?.id ?? null,
        drawingIds: slots.drawings.slice(0, 4).map((d) => d.id),
        applicationId: slots.application?.id ?? null,
      },
      showBrandLogo: Boolean(p.brand && BRAND_LOGOS[p.brand.trim().toLowerCase()]),
      brand: p.brand,
    },
    imageOptions: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      width: i.width,
      height: i.height,
      role: i.role,
    })),
  };
}

/**
 * The line under the product code. A chandelier's lighting type is its model
 * series and already ends in "Chandelier" ("MC15E Chandelier"), so the
 * general pattern printed "MC15E Chandelier — Chandelier Series".
 */
function categoryLabel(family: string, lightingType: string, familyLabel: string): string {
  if (family === "CHANDELIER") {
    const series = lightingType.replace(/\s*chandeliers?\s*$/i, "").trim();
    return series ? `Chandelier — ${series} Series` : "Chandelier";
  }
  return `${lightingType} — ${familyLabel} Series`;
}

/** mapDraft with the product's pictures fetched first — the export's path. */
export async function draftToDatasheetData(
  draft: DatasheetDraft,
  resolveImage: (id: string) => Promise<ImageRef | undefined> | ImageRef | undefined
): Promise<DatasheetProductData> {
  const ids = [draft.images.photoId, draft.images.applicationId, ...draft.images.drawingIds.slice(0, 4)].filter(
    (id): id is string => Boolean(id)
  );
  const resolved = new Map<string, ImageRef | undefined>(
    await Promise.all(ids.map(async (id) => [id, await resolveImage(id)] as const))
  );
  return mapDraft(draft, (id) => resolved.get(id));
}


/** Server-side resolver: only this product's image ids, fetched as bytes. */
export async function productImageResolver(productId: string) {
  const images = await prisma.productImage.findMany({ where: { productId }, select: { id: true, url: true } });
  const byId = new Map(images.map((i) => [i.id, i.url]));
  return (id: string) => {
    const url = byId.get(id);
    return url ? resolveImageUrl(url) : undefined;
  };
}

/** The unedited sheet for a product — what the quick download buttons produce. */
export async function getDatasheetProductData(productId: string): Promise<DatasheetProductData | null> {
  const loaded = await getDatasheetDraft(productId);
  if (!loaded) return null;
  return draftToDatasheetData(loaded.draft, await productImageResolver(productId));
}
