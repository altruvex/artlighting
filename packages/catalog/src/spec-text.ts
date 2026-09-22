import { parseSpecValue, type ParsedSpecValue } from "./specs";

/**
 * Reading one spec back from the English text an admin types or the
 * datasheet displays. Pure — the admin editor runs it in the browser to show
 * what a value will be stored as before it is saved, and `spec-write` runs
 * the same function on the server when it is.
 */

/**
 * The display text reshaped into what the column parser expects. The
 * formatter adds thousands separators and trailing units the parsers were
 * never written to read back ("50,000 h", "IP 65", "3,000 / 4,000 K").
 */
export function prepareSpecText(key: string | null, text: string): string {
  let value = text.trim();
  if (key === "ip") value = value.replace(/^ip\s*/i, "");
  if (key === "maximumWattage") value = value.replace(/\s*(w|watts?)\s*$/i, "");
  if (key === "lifeTime") value = value.replace(/\s*(h|hrs?|hours?)\s*$/i, "");
  if (key === "colorTemperature" && /^[\d.,\s/]+k$/i.test(value)) {
    value = value
      .replace(/k$/i, "")
      .split("/")
      .map((part) => `${part.trim()}K`)
      .join(" / ");
  }
  return value;
}

export function parseSpecText(key: string | null, english: string): ParsedSpecValue {
  return parseSpecValue(key ?? "", prepareSpecText(key, english), null);
}
