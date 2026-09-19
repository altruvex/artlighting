/**
 * Fails when an exported server action or route handler has no
 * authorization call. The proxy is optimistic and never protects server
 * actions (they are public POST endpoints), so each one must authorize
 * itself. Run as part of `check-types`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "lib"];
const GUARDS = /\b(requireAdmin|requirePermission|requireAdminOrRedirect|requirePermissionOrRedirect|requireWorkerSecret)\b/;
const EXPORTED_FN = /export\s+(?:async\s+function|const)\s+([A-Za-z0-9_]+)/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      out.push(...walk(path));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

const problems = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const isServerAction = source.includes('"use server"') || source.includes("'use server'");
    const isRouteHandler = /\/route\.tsx?$/.test(file);
    // Better Auth mounts its own handler and does its own checking.
    if (file.includes(join("api", "auth"))) continue;
    if (!isServerAction && !isRouteHandler) continue;
    if (GUARDS.test(source)) continue;
    const exported = [...source.matchAll(EXPORTED_FN)].map((m) => m[1]);
    if (exported.length === 0) continue;
    problems.push(`${file}: ${exported.join(", ")}`);
  }
}

if (problems.length > 0) {
  console.error(
    "Server actions / route handlers without an authorization call:\n  " + problems.join("\n  "),
  );
  process.exit(1);
}
console.log("action guards OK");
