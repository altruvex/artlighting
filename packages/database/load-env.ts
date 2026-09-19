import { config } from "dotenv";

/**
 * Loads env the way Next.js does: .env.local first, then .env, with
 * already-set variables winning. Without this the Prisma CLI and scripts
 * read .env only — which is where the PRODUCTION connection string lives
 * while .env.local points at the Neon dev branch.
 */
export function loadEnv(cwd = process.cwd()) {
  config({ path: `${cwd}/.env.local` });
  config({ path: `${cwd}/.env` });
}

/** Neon's pooled runtime URL. */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

/**
 * Direct (non-pooled) URL for migrations. Accepts Neon's Vercel-style name
 * as well, since that is what the integration writes.
 */
export function directUrl(): string | undefined {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL_WITH_OUT_POOLING;
}

export function hostOf(url: string | undefined): string {
  if (!url) return "(unset)";
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
}

/** The production Neon endpoint; see docs/UPGRADE_PLAN.md §0. */
const PRODUCTION_ENDPOINT = "ep-empty-fog";

export function isProductionHost(url: string | undefined): boolean {
  return hostOf(url).includes(PRODUCTION_ENDPOINT);
}

/**
 * Throws when a write script is pointed at production. Set
 * ALLOW_PRODUCTION_WRITES=1 to override deliberately (nothing in this repo
 * does that on its own).
 */
export function assertNotProduction(url = databaseUrl()): void {
  if (isProductionHost(url) && process.env.ALLOW_PRODUCTION_WRITES !== "1") {
    throw new Error(
      `Refusing to run: DATABASE_URL points at production (${hostOf(url)}). ` +
        "Point .env.local at the Neon dev branch first.",
    );
  }
}
