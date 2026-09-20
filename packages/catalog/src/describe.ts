import type { BulbChoice } from "./bulb-pricing";

/**
 * What a product says about itself, built from what the catalogue actually
 * records about it.
 *
 * There were three of these before — one for the product page, one for the
 * full description under it, one for the card — each with its own branch
 * per brand and family, each reading the legacy spec columns, and all
 * three disagreeing. A product outside their four branches got "High
 * quality lighting product", and a missing value came through as prose:
 * "crafted with premium N/A".
 *
 * Worse, they stated things that are data now. Both card templates promise
 * "interchangeable 9W or 12W bulbs" and the page multiplies arms by a
 * hard-coded 12 W — written before bulbs were rows. Four fixtures take a
 * 3 W candle, and the sentence would still have said 12.
 *
 * So nothing here branches on brand. A clause is included when its spec
 * exists and left out when it does not, which is why a Balcom spotlight
 * and a Mister-LED chandelier read differently without either being named:
 * one records a beam angle and a luminous flux, the other arms and a
 * finish.
 *
 * The wording stays in the message files. This decides *which* sentences a
 * product gets and in what order; the translator decides how they read.
 * Returning keys rather than text is what keeps the Arabic idiomatic
 * instead of assembled from English word order.
 */

export interface DescriptionClause {
  /** A key under the `product-description` namespace. */
  key: string;
  params?: Record<string, string | number>;
}

export interface DescribableProduct {
  family: "INDOOR" | "OUTDOOR" | "CHANDELIER";
  /** The lighting type's name in this locale, e.g. "Track Light" / "تراك لايت". */
  lightingTypeName?: string | null;
  /** Arms, for a fixture that takes bulbs. */
  hNumber?: number | null;
  /** What it is sold with; the bulb clause comes from here, not a constant. */
  bulbChoices?: BulbChoice[];
  /**
   * Spec values by their language-neutral key, already rendered for this
   * locale — Arabic-Indic digits and units included. A plain record rather
   * than the spec groups themselves, so this stays free of the view model
   * and can be tested without one.
   */
  specs?: Record<string, string>;
}

/**
 * The clauses each level of detail may use, in the order they read best.
 *
 * `short` is what a card and the paragraph under the title show. `full` is
 * the block further down the product page, which may take everything.
 */
const SHORT_CLAUSES = ["material", "arms", "luminousFlux", "beamAngle", "ip"] as const;
const FULL_CLAUSES = [
  "material",
  "arms",
  "lampBase",
  "finish",
  "luminousFlux",
  "beamAngle",
  "colorTemperature",
  "cri",
  "ip",
  "lifeTime",
  "input",
  "energySaving",
] as const;

type ClauseName = (typeof FULL_CLAUSES)[number];

export function describeProduct(
  product: DescribableProduct,
  detail: "short" | "full" = "short",
): DescriptionClause[] {
  const specs = product.specs ?? {};
  const arms = product.hNumber ?? 0;
  // The bulb it is sold with — the one whose price the fixture already
  // includes. Not a wattage written into a sentence years ago.
  const soldWith =
    product.bulbChoices?.find((choice) => choice.isDefault) ?? product.bulbChoices?.[0];

  // Named per family so each reads as its own kind of thing rather than
  // "a lighting product", and in two shapes so a product with no wattage
  // recorded does not read as one drawing nothing.
  //
  // Two namespaces rather than a key ending ".withWattage": next-intl reads
  // a dot as nesting, so that key could never have resolved.
  const opening: DescriptionClause = {
    key: specs.maximumWattage
      ? `openingWithWattage.${product.family}`
      : `opening.${product.family}`,
    params: {
      type: product.lightingTypeName?.trim() || "",
      wattage: specs.maximumWattage ?? "",
    },
  };

  const available: Partial<Record<ClauseName, DescriptionClause>> = {
    material: specs.mainMaterial ? { key: "clause.material", params: { material: specs.mainMaterial } } : undefined,
    arms:
      arms > 0 && soldWith
        ? {
            key: "clause.armsWithBulb",
            params: { count: arms, bulb: soldWith.name, wattage: soldWith.wattage },
          }
        : arms > 0
          ? { key: "clause.arms", params: { count: arms } }
          : undefined,
    lampBase: specs.lampBase ? { key: "clause.lampBase", params: { base: specs.lampBase } } : undefined,
    finish: specs.finish ? { key: "clause.finish", params: { finish: specs.finish } } : undefined,
    luminousFlux: specs.luminousFlux ? { key: "clause.luminousFlux", params: { flux: specs.luminousFlux } } : undefined,
    beamAngle: specs.beamAngle ? { key: "clause.beamAngle", params: { angle: specs.beamAngle } } : undefined,
    colorTemperature: specs.colorTemperature
      ? { key: "clause.colorTemperature", params: { temperature: specs.colorTemperature } }
      : undefined,
    cri: specs.cri ? { key: "clause.cri", params: { cri: specs.cri } } : undefined,
    ip: specs.ip ? { key: "clause.ip", params: { ip: specs.ip } } : undefined,
    lifeTime: specs.lifeTime ? { key: "clause.lifeTime", params: { hours: specs.lifeTime } } : undefined,
    input: specs.input ? { key: "clause.input", params: { input: specs.input } } : undefined,
    energySaving: specs.energySaving
      ? { key: "clause.energySaving", params: { saving: specs.energySaving } }
      : undefined,
  };

  const order = detail === "short" ? SHORT_CLAUSES : FULL_CLAUSES;
  const clauses = order.map((name) => available[name]).filter(Boolean) as DescriptionClause[];

  // A card's line stays a line. The page's block may run long.
  const kept = detail === "short" ? clauses.slice(0, 3) : clauses;

  return [opening, ...kept];
}
