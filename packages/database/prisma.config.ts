import { defineConfig } from "prisma/config";
import { directUrl, loadEnv } from "./load-env";

loadEnv(import.meta.dirname);

/**
 * Prisma CLI configuration (migrate, studio, generate).
 *
 * Migrations run over the non-pooled connection — DIRECT_URL, or Neon's
 * DATABASE_URL_WITH_OUT_POOLING — because the pooler is PgBouncer in
 * transaction mode, which migrations can't use. There is deliberately NO
 * fallback to DATABASE_URL: until one of those is set (to the Neon `dev`
 * branch), migrate/studio fail instead of silently running against
 * whatever DATABASE_URL points at. `prisma generate` needs no connection.
 *
 * Env is loaded .env.local first, then .env, like Next.js does.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl() ?? "",
  },
});
