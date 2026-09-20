import { money } from "@repo/money";

/**
 * Turning the hand-typed spec strings into numbers.
 *
 * Every spec value used to be a string written once in English and once in
 * Arabic, which is how one product came to claim "1320LM (3000k) / 1400LM
 * (6500k)" in English and "٦٢٠ لومن/متر" in Arabic — two independently
 * editable strings for one physical fact. Parsing them into numbers is what
 * makes that disagreement unrepresentable.
 *
 * The parser is deliberately strict: anything it cannot read confidently
 * stays TEXT and is reported, because a wrong number on a datasheet is worse
 * than an unconverted string.
 */

export type SpecValueKind = "MEASUREMENT" | "RANGE" | "CHOICE" | "TEXT";
export type SpecComparator = "EXACT" | "AT_LEAST" | "AT_MOST" | "APPROX";

export interface ParsedMeasurement {
  value: string;
  valueMax?: string;
  conditionValue?: string;
  conditionUnit?: string;
}

export interface ParsedSpecValue {
  kind: SpecValueKind;
  unit?: string;
  comparator: SpecComparator;
  measurements: ParsedMeasurement[];
  /** CHOICE: the language-neutral vocabulary key. */
  optionKey?: string;
  /** TEXT: the original string, kept per language. */
  text?: string;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Arabic-Indic digits and the Arabic decimal/thousands marks to ASCII. */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const character of input) {
    const index = ARABIC_DIGITS.indexOf(character);
    if (index >= 0) out += String(index);
    else if (character === "٫") out += ".";
    else if (character === "٬" || character === ",") out += "";
    else out += character;
  }
  return out;
}

function comparatorOf(input: string): { comparator: SpecComparator; rest: string } {
  const trimmed = input.trim();
  if (/^[≥>]=?/.test(trimmed)) return { comparator: "AT_LEAST", rest: trimmed.replace(/^[≥>]=?/, "").trim() };
  if (/^[≤<]=?/.test(trimmed)) return { comparator: "AT_MOST", rest: trimmed.replace(/^[≤<]=?/, "").trim() };
  if (/^[~≈]/.test(trimmed)) return { comparator: "APPROX", rest: trimmed.replace(/^[~≈]/, "").trim() };
  return { comparator: "EXACT", rest: trimmed };
}

function decimal(raw: string): string | null {
  const cleaned = normalizeDigits(raw).replace(/\s+/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  try {
    return money(cleaned).toFixed(4);
  } catch {
    return null;
  }
}

const TEXT_VALUE: ParsedSpecValue = { kind: "TEXT", comparator: "EXACT", measurements: [] };

/** A plain number with a known unit: "15" W, "50,000" h, "20" (IP). */
function parseScalar(input: string, unit?: string): ParsedSpecValue | null {
  const { comparator, rest } = comparatorOf(input);
  const value = decimal(rest);
  if (value === null) return null;
  return { kind: "MEASUREMENT", unit, comparator, measurements: [{ value }] };
}

/** "53°" / "٥٣°" — a number with the degree sign attached. */
function parseDegrees(input: string): ParsedSpecValue | null {
  const match = normalizeDigits(input).trim().match(/^(-?\d+(?:\.\d+)?)\s*°$/);
  if (!match) return null;
  const value = decimal(match[1]!);
  return value === null ? null : { kind: "MEASUREMENT", unit: "°", comparator: "EXACT", measurements: [{ value }] };
}

/** "-10° to 45° C" / "من -١٠° إلى ٤٥° مئوية". */
function parseTemperatureRange(input: string): ParsedSpecValue | null {
  const normalized = normalizeDigits(input).replace(/[°]/g, " ");
  const numbers = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length !== 2) return null;
  const [min, max] = [decimal(numbers[0]!), decimal(numbers[1]!)];
  if (min === null || max === null) return null;
  return { kind: "RANGE", unit: "°C", comparator: "EXACT", measurements: [{ value: min, valueMax: max }] };
}

/**
 * "1320LM (3000k) / 1400LM (6500k)", "440 LM (3000K / 6500K)", "620 lm/m".
 * One measurement per colour temperature; a figure quoted for several
 * temperatures at once is recorded once per temperature, because that is
 * what it means.
 */
function parseLuminousFlux(input: string): ParsedSpecValue | null {
  const normalized = normalizeDigits(input).replace(/لومن/gi, "LM").replace(/كلفن/gi, "K");
  const perMetre = /\/\s*(m\b|متر)/i.test(normalized);
  const unit = perMetre ? "lm/m" : "lm";

  const segments = normalized.split("/").map((segment) => segment.trim()).filter(Boolean);
  const measurements: ParsedMeasurement[] = [];

  // "440 LM (3000K / 6500K)" — one figure, several conditions.
  const single = normalized.match(/^(\d+(?:\.\d+)?)\s*LM\s*\(([^)]+)\)$/i);
  if (single) {
    const value = decimal(single[1]!);
    if (value === null) return null;
    const conditions = single[2]!.split("/").map((c) => c.trim()).filter(Boolean);
    for (const condition of conditions) {
      const k = condition.match(/(\d+(?:\.\d+)?)\s*K/i);
      const conditionValue = k ? decimal(k[1]!) : null;
      measurements.push({
        value,
        ...(conditionValue !== null ? { conditionValue, conditionUnit: "K" } : {}),
      });
    }
    return measurements.length > 0
      ? { kind: "MEASUREMENT", unit, comparator: "EXACT", measurements }
      : null;
  }

  // "1320LM (3000k) / 1400LM (6500k)" — a figure per condition.
  for (const segment of segments) {
    const pair = segment.match(/^(\d+(?:\.\d+)?)\s*LM\s*(?:\(\s*(\d+(?:\.\d+)?)\s*K\s*\))?$/i);
    if (!pair) continue;
    const value = decimal(pair[1]!);
    if (value === null) continue;
    const conditionValue = pair[2] ? decimal(pair[2]) : null;
    measurements.push({ value, ...(conditionValue ? { conditionValue, conditionUnit: "K" } : {}) });
  }
  if (measurements.length > 0) return { kind: "MEASUREMENT", unit, comparator: "EXACT", measurements };

  // "620 lm/m" and friends: a bare figure with the unit spelled out.
  const bare = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:LM)?/i);
  if (bare) {
    const value = decimal(bare[1]!);
    if (value !== null) return { kind: "MEASUREMENT", unit, comparator: "EXACT", measurements: [{ value }] };
  }
  return null;
}

/** "3000K / 4000K / 6500K" — the temperatures a fixture can be ordered in. */
function parseColorTemperatures(input: string): ParsedSpecValue | null {
  const normalized = normalizeDigits(input).replace(/كلفن/gi, "K");
  const matches = [...normalized.matchAll(/(\d{3,5})\s*K/gi)];
  if (matches.length === 0) return null;
  const measurements: ParsedMeasurement[] = [];
  for (const match of matches) {
    const value = decimal(match[1]!);
    if (value !== null) measurements.push({ value });
  }
  return measurements.length > 0
    ? { kind: "MEASUREMENT", unit: "K", comparator: "EXACT", measurements }
    : null;
}

/**
 * The columns whose values are a choice, not a number. The key is derived
 * from the **English** value: it is the one written consistently, and a key
 * has to be stable and language-neutral.
 */
export function optionKeyFor(englishValue: string): string {
  const key = englishValue
    .trim()
    .toLowerCase()
    // Spelled out, or "90%" and "90" collapse to the same meaningless key.
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  // A key that is only digits says nothing about what it means.
  return /^\d+$/.test(key) ? `value_${key}` : key;
}

/** Which parser a column gets, and the unit its numbers carry. */
const COLUMN_RULES: Record<
  string,
  { parse: (value: string) => ParsedSpecValue | null; kind: SpecValueKind }
> = {
  maximumWattage: { parse: (v) => parseScalar(v, "W"), kind: "MEASUREMENT" },
  lifeTime: { parse: (v) => parseScalar(v, "h"), kind: "MEASUREMENT" },
  ip: { parse: (v) => parseScalar(v), kind: "MEASUREMENT" },
  cri: { parse: (v) => parseScalar(v), kind: "MEASUREMENT" },
  powerFactor: { parse: (v) => parseScalar(v), kind: "MEASUREMENT" },
  beamAngle: { parse: parseDegrees, kind: "MEASUREMENT" },
  workingTemperature: { parse: parseTemperatureRange, kind: "RANGE" },
  luminousFlux: { parse: parseLuminousFlux, kind: "MEASUREMENT" },
  colorTemperature: { parse: parseColorTemperatures, kind: "MEASUREMENT" },
};

/** Columns whose value is an option from the shared vocabulary. */
export const CHOICE_COLUMNS = new Set([
  "mainMaterial",
  "electrical",
  "fixtureDimmable",
  "brandOfLed",
  "finish",
  "lampBase",
  "bulb",
  "input",
  "energySaving",
]);

/**
 * Reads one spec column. English is the source of the numbers because it is
 * the side written consistently; Arabic is only consulted when English is
 * missing, and only for the parsers that accept Arabic digits.
 */
export function parseSpecValue(
  column: string,
  english: string | null | undefined,
  arabic: string | null | undefined,
): ParsedSpecValue {
  const en = english?.trim() || null;
  const ar = arabic?.trim() || null;

  if (CHOICE_COLUMNS.has(column)) {
    const source = en ?? ar;
    if (!source) return TEXT_VALUE;
    // Keyed off English when there is one, so the same material on two
    // products lands on the same key.
    return { kind: "CHOICE", comparator: "EXACT", measurements: [], optionKey: optionKeyFor(en ?? source) };
  }

  const rule = COLUMN_RULES[column];
  if (!rule) return { ...TEXT_VALUE, text: en ?? ar ?? undefined };

  for (const candidate of [en, ar]) {
    if (!candidate) continue;
    const parsed = rule.parse(candidate);
    if (parsed) return parsed;
  }
  // Unparseable: kept as text and reported, never guessed at.
  return { ...TEXT_VALUE, text: en ?? ar ?? undefined };
}
