import { z } from "zod";

/**
 * Server-side environment contract for apps/admin, validated once at server
 * start (instrumentation.ts). Keep in sync with .env.example.
 *
 * - core: the app is broken or insecure without these. Production refuses
 *   to boot; development warns.
 * - features: only the feature that uses them breaks (image upload,
 *   datasheet generation). Always a warning.
 */
const APP = "apps/admin";
const url = z.url();

const core = z.object({
  DATABASE_URL: z.string().startsWith("postgres", "must be a postgres:// connection string"),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
});

const features = z.object({
  BETTER_AUTH_URL: url.optional(),
  NEXT_PUBLIC_APP_URL: url.optional(),
  // Same value as apps/web's: lets catalogue writes here refresh the
  // storefront's cache at once (lib/storefront.ts).
  STOREFRONT_REVALIDATE_SECRET: z.string().min(32, "must be at least 32 characters").optional(),
  CLOUD_NAME: z.string().min(1),
  CLOUD_API_KEY: z.string().min(1),
  CLOUD_API_SECRET: z.string().min(1),
  DATASHEET_WORKER_URL: url,
  DATASHEET_WORKER_SECRET: z.string().min(32, "must be at least 32 characters"),
});

export function validateServerEnv(): void {
  const problems = (schema: z.ZodType, source: NodeJS.ProcessEnv) => {
    const result = schema.safeParse(source);
    return result.success
      ? []
      : result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  };

  const coreProblems = problems(core, process.env);
  const featureProblems = problems(features, process.env);

  if (featureProblems.length > 0) {
    console.warn(`[env] ${APP}: optional features are misconfigured and will fail when used:\n${featureProblems.join("\n")}`);
  }
  if (coreProblems.length === 0) return;

  const message = `Invalid environment for ${APP}:\n${coreProblems.join("\n")}\nSee ${APP}/.env.example.`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[env] ${message}`);
}
