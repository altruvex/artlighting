import type { DatasheetSection, LabelValueRow } from "@repo/datasheet";

/**
 * Optional per-product overrides stored in `ProductSpecification.customSpecs`.
 *
 * The fixed spec columns describe a self-contained luminaire. They do NOT
 * describe a bollard on a pole (the BO-014/BO-100W shape), which needs BASE /
 * POLE / ARM / LUMINAIRE blocks with labels the schema has no columns for.
 * Rather than migrate the schema for every future product family,
 * `customSpecs` is the escape hatch: `extraSections` appends arbitrary titled
 * blocks and `rows` patches values into the generated ones.
 */
export interface DatasheetCustomSpecs {
  /** Patch/add rows in a generated section, e.g. {"Specifications": {"Diffuser": "Glass Diffuser"}}. */
  rows?: Record<string, Record<string, string>>;
  /** Whole extra sections, inserted before CONTROL UNIT, e.g. BASE SPECIFICATION. */
  extraSections?: { title: string; rows: Record<string, string> }[];
  controlUnit?: {
    type?: string;
    supplier?: string;
    lginator?: string;
    capacitor?: string;
  };
}

/** The spec-column subset this module reads. Mirrors ProductSpecification without importing Prisma types. */
export interface SpecFields {
  input?: string | null;
  maximumWattage?: string | null;
  brandOfLed?: string | null;
  luminousFlux?: string | null;
  mainMaterial?: string | null;
  cri?: string | null;
  beamAngle?: string | null;
  workingTemperature?: string | null;
  fixtureDimmable?: string | null;
  electrical?: string | null;
  powerFactor?: string | null;
  colorTemperature?: string | null;
  ip?: string | null;
  energySaving?: string | null;
  lifeTime?: string | null;
  finish?: string | null;
  lampBase?: string | null;
  bulb?: string | null;
}

export type ProductFamily = "indoor" | "outdoor" | "chandelier";

/**
 * Maps a top-level category name onto the three families the sheets are
 * designed around. Unknown categories fall back to `indoor`, which is the
 * most generic LED-fixture layout.
 */
export function resolveFamily(categoryName: string | null | undefined): ProductFamily {
  const n = (categoryName ?? "").trim().toLowerCase();
  if (n.startsWith("outdoor")) return "outdoor";
  if (n.startsWith("chandelier")) return "chandelier";
  return "indoor";
}

function row(
  label: string,
  value: string | null | undefined,
  opts?: { highlight?: boolean }
): LabelValueRow | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return { label, value: trimmed, highlight: opts?.highlight };
}

const keep = (rows: (LabelValueRow | null)[]): LabelValueRow[] =>
  rows.filter((r): r is LabelValueRow => r !== null);

/**
 * Adds a unit to a bare number, leaving already-qualified values alone.
 * The catalog stores `ip: "20"` and `maximumWattage: "15"` as bare figures,
 * but the reference sheets print "IP 65" and "50 W" — a naked "20" in an IP
 * row is ambiguous to the reader.
 */
function withUnit(value: string | null | undefined, prefix: string, suffix: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[\d.,\s/-]+$/.test(trimmed)) return trimmed; // already carries units/words
  return `${prefix}${trimmed}${suffix}`.trim();
}

function applyRowOverrides(
  section: DatasheetSection,
  overrides: Record<string, Record<string, string>> | undefined
): DatasheetSection {
  const patch = overrides?.[section.title];
  if (!patch) return section;

  const rows = [...section.rows];
  for (const [label, value] of Object.entries(patch)) {
    if (!value?.trim()) continue;
    const existing = rows.findIndex((r) => r.label === label);
    if (existing >= 0) rows[existing] = { ...rows[existing]!, value: value.trim() };
    else rows.push({ label, value: value.trim() });
  }
  return { ...section, rows };
}

/**
 * Builds the right-column sections for a product, ordered for its family.
 *
 * The three families genuinely describe different things, so they do not get
 * the same row order:
 *   - indoor/outdoor are LED luminaires — the optical figures (beam angle,
 *     lumens, CRI) are what a specifier compares, and IP leads outdoor;
 *   - a chandelier is a decorative fitting taking a replaceable lamp — its
 *     buyer cares about finish, lamp base and whether a bulb is included, and
 *     it has no IP, beam angle or CRI in the catalog at all.
 *
 * Empty rows are dropped and empty sections disappear, so a product missing a
 * value never renders a blank line.
 *
 * Row placement follows the reference sheets rather than the shape of the
 * database: `electrical` ("balcom internal Driver") describes the DRIVER, so
 * it is the CONTROL UNIT's Type — not a LAMP DATA row.
 */
export function buildDatasheetSections(args: {
  spec: SpecFields | null | undefined;
  brand: string | null | undefined;
  family: ProductFamily;
  customSpecs: DatasheetCustomSpecs | null | undefined;
}): DatasheetSection[] {
  const { spec, brand, family, customSpecs } = args;
  const s = spec ?? {};

  const ip = row("IP Rating", withUnit(s.ip, "IP ", ""));
  const body = row("Body", s.mainMaterial);
  const finish = row("Finish", s.finish);
  const beam = row("Beam Angle", s.beamAngle);
  const temp = row("Working Temperature", s.workingTemperature);
  const dimmable = row("Dimmable", s.fixtureDimmable);

  const lampBrand = row("Lamp Brand", s.brandOfLed);
  const lampBase = row("Lamp Base", s.lampBase);
  const bulb = row("Bulb Included", s.bulb);
  const watt = row("Wattage", withUnit(s.maximumWattage, "", " W"));
  const volts = row("Voltage", s.input);
  const lumen = row("Lamp Lumen", s.luminousFlux);
  const cct = row("Color Temp", s.colorTemperature);
  const cri = row("CRI", s.cri);
  const pf = row("Power Factor", s.powerFactor);
  const eco = row("Energy Saving", s.energySaving);
  const life = row("Life Time", s.lifeTime, { highlight: true });

  let specifications: LabelValueRow[];
  let lampData: LabelValueRow[];

  if (family === "chandelier") {
    // Decorative fitting: material and finish define it; the lamp is replaceable.
    specifications = keep([body, finish, dimmable]);
    lampData = keep([lampBase, bulb, watt, volts, cct, lumen, life]);
  } else if (family === "outdoor") {
    // Ingress protection is the first thing an outdoor specifier checks.
    specifications = keep([ip, body, finish, beam, temp, dimmable]);
    lampData = keep([lampBrand, watt, volts, lumen, cct, cri, pf, eco, life]);
  } else {
    specifications = keep([ip, body, beam, temp, dimmable]);
    lampData = keep([lampBrand, watt, volts, lumen, cct, cri, pf, eco, life]);
  }

  // CONTROL UNIT — the driver. `electrical` is the driver description, and
  // the supplier is the product's own brand unless overridden.
  const cu = customSpecs?.controlUnit;
  const controlUnit = keep([
    row("Type", cu?.type ?? s.electrical),
    row("Supplier", cu?.supplier ?? (brand ? brand.toUpperCase() : null)),
    row("Lginator", cu?.lginator),
    row("Capacitor", cu?.capacitor),
  ]);

  const generated: DatasheetSection[] = [
    { title: "Specifications", rows: specifications },
    { title: "Lamp Data", rows: lampData },
  ].map((section) => applyRowOverrides(section, customSpecs?.rows));

  const extra: DatasheetSection[] = (customSpecs?.extraSections ?? [])
    .map((sec) => ({
      title: sec.title,
      rows: keep(Object.entries(sec.rows ?? {}).map(([label, value]) => row(label, value))),
    }))
    .filter((sec) => sec.rows.length > 0);

  const controlUnitSection = applyRowOverrides(
    { title: "Control Unit", rows: controlUnit },
    customSpecs?.rows
  );

  // CONTROL UNIT closes the column on both reference sheets.
  return [...generated, ...extra, controlUnitSection].filter((sec) => sec.rows.length > 0);
}

/**
 * Composes a DESCRIPTION paragraph from spec values the catalog actually holds.
 *
 * No product in the catalog has an authored description, and this fills that
 * gap on Ali's instruction. It states ONLY values read from the product's own
 * spec row — it never asserts a quality, application, or benefit the data does
 * not contain, because this file is sent to customers. An authored
 * `ProductTranslation.description` always wins over it.
 */
export function composeDescription(
  spec: SpecFields | null | undefined,
  family: ProductFamily = "indoor"
): string {
  if (!spec) return "";
  const s = spec;
  const sentences: string[] = [];

  const material = s.mainMaterial?.trim();
  const finish = s.finish?.trim();
  const ip = withUnit(s.ip, "IP ", "");

  const noun = family === "chandelier" ? "fitting" : "fixture";

  if (material) {
    let lead = `${material} ${noun}`;
    if (finish) lead += ` in ${finish} finish`;
    if (ip) lead += `, rated ${ip}`;
    sentences.push(`${lead}.`);
  } else if (ip) {
    sentences.push(`Rated ${ip}.`);
  }

  const output: string[] = [];
  const watts = withUnit(s.maximumWattage, "", " W");
  if (watts) output.push(watts);
  if (s.luminousFlux?.trim()) output.push(s.luminousFlux.trim());
  if (s.colorTemperature?.trim()) output.push(`${s.colorTemperature.trim()} colour temperature`);
  if (s.cri?.trim()) output.push(`CRI ${s.cri.trim()}`);
  if (output.length) sentences.push(`Delivers ${output.join(", ")}.`);

  if (s.lampBase?.trim() && family === "chandelier") {
    sentences.push(`Takes ${s.lampBase.trim()} lamps.`);
  }
  if (s.lifeTime?.trim()) sentences.push(`Rated life ${s.lifeTime.trim()} hours.`);

  return sentences.join(" ");
}
