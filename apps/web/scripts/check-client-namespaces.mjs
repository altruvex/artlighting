// Fails when a Client Component uses a translation namespace that the root
// layout does not send to the browser.
//
// The layout ships only CLIENT_NAMESPACES (src/i18n/client-messages.ts):
// the full message files are ~60 KB and most of it is only ever rendered on
// the server. The risk of a hand-kept list is a client string that silently
// shows its key instead of its text; this closes it. It follows every import
// from each "use client" file (a shared component rendered inside one runs
// on the client too) and collects the namespaces passed to useTranslations.
//
// Run by `pnpm lint`. Usage: node scripts/check-client-namespaces.mjs
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(app, "src");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(path);
  }
  return out;
}

function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(src, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  return null;
}

const files = walk(src);
const text = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const directive = (file, name) => new RegExp(`^\\s*['"]use ${name}['"]`).test(text.get(file) ?? "");

const seen = new Set();
const stack = files.filter((file) => directive(file, "client"));
while (stack.length) {
  const file = stack.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  for (const [, spec] of (text.get(file) ?? "").matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const target = resolve(file, spec);
    // A server action's body never runs in the browser.
    if (target && !directive(target, "server")) stack.push(target);
  }
}

const listed = new Set(
  [...readFileSync(join(src, "i18n/client-messages.ts"), "utf8").matchAll(/^\s*"([^"]+)",?$/gm)].map((m) => m[1]),
);
const problems = [];
for (const file of seen) {
  const source = text.get(file);
  if (/useTranslations\(\s*\)/.test(source)) problems.push(`${file}: useTranslations() without a namespace`);
  for (const [, namespace] of source.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
    const top = namespace.split(".")[0];
    if (!listed.has(top)) problems.push(`${file.replace(app + "/", "")}: "${top}" is not in CLIENT_NAMESPACES`);
  }
}

if (problems.length) {
  console.error("Client translations missing from src/i18n/client-messages.ts:\n  " + [...new Set(problems)].join("\n  "));
  process.exit(1);
}
console.log(`client namespaces ok (${listed.size} sent, ${seen.size} client-reachable files checked)`);
