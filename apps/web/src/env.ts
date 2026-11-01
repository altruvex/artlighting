import { z } from "zod";
import { upstashRest } from "../upstash-rest.cjs";

/**
 * Server-side environment contract for apps/web, validated once at server
 * start (src/instrumentation.ts). Keep in sync with .env.example.
 *
 * - core: the app is broken or insecure without these. Production refuses
 *   to boot; development warns.
 * - features: only the feature that uses them breaks. Always a warning.
 */
const APP = "apps/web";
const url = z.url();

const core = z.object({
  DATABASE_URL: z.string().startsWith("postgres", "must be a postgres:// connection string"),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: url,
});

const features = z.object({
  BETTER_AUTH_URL: url.optional(),
  NEXT_PUBLIC_ADMIN_URL: url.optional(),
  // Order and account emails (lib/email). Without the key they are logged.
  RESEND_API_KEY: z.string().startsWith("re_", "must be a Resend API key (re_…)").optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  ORDER_NOTIFY_EMAIL: z.string().min(3).optional(),
  // Shared with apps/admin: lets it drop the cached catalogue after a write
  // (app/api/revalidate). Without it, admin edits show within 5 minutes.
  STOREFRONT_REVALIDATE_SECRET: z.string().min(32, "must be at least 32 characters").optional(),
});

export function validateServerEnv(): void {
  const problems = (schema: z.ZodType, source: NodeJS.ProcessEnv) => {
    const result = schema.safeParse(source);
    return result.success
      ? []
      : result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  };

  const coreProblems = problems(core, process.env);
  // Redis can come as REDIS_URL or as the UPSTASH_REDIS_REST_* pair.
  if (!upstashRest()) {
    coreProblems.push("  - REDIS_URL: set it (rediss://…@<db>.upstash.io) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN");
  }
  const featureProblems = problems(features, process.env);

  if (featureProblems.length > 0) {
    console.warn(`[env] ${APP}: optional features are misconfigured and will fail when used:\n${featureProblems.join("\n")}`);
  }
  if (coreProblems.length === 0) return;

  const message = `Invalid environment for ${APP}:\n${coreProblems.join("\n")}\nSee ${APP}/.env.example.`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[env] ${message}`);
}
