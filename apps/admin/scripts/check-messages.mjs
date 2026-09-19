// Fails when messages/en and messages/ar drift apart: every message file
// must exist in both locales with exactly the same keys, and no message may
// be empty. Run as part of `check-types`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../messages/", import.meta.url).pathname;
const locales = ["en", "ar"];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

const files = new Set(locales.flatMap((l) => readdirSync(join(root, l)).filter((f) => f.endsWith(".json"))));
const errors = [];

for (const file of files) {
  const maps = {};
  for (const l of locales) {
    try {
      maps[l] = new Map(flatten(JSON.parse(readFileSync(join(root, l, file), "utf8"))));
    } catch (e) {
      errors.push(`${l}/${file}: ${e.code === "ENOENT" ? "missing file" : e.message}`);
    }
  }
  if (!maps.en || !maps.ar) continue;
  for (const [a, b] of [["en", "ar"], ["ar", "en"]]) {
    for (const key of maps[a].keys()) if (!maps[b].has(key)) errors.push(`${b}/${file}: missing key ${key}`);
  }
  for (const l of locales) {
    for (const [key, v] of maps[l]) if (typeof v !== "string" || v.trim() === "") errors.push(`${l}/${file}: empty or non-string ${key}`);
  }
}

if (errors.length) {
  console.error(`Message catalogs out of sync:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`messages OK (${files.size} files, en/ar in sync)`);
