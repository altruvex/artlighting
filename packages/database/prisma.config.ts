import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (migrate, studio, generate).
 *
 * Migrations run over DIRECT_URL, the non-pooled Neon connection (Neon's
 * pooler is PgBouncer in transaction mode, which migrations can't use).
 * There is deliberately NO fallback to DATABASE_URL: until DIRECT_URL is
 * set (to the Neon `dev` branch, see .env.example), migrate/studio fail
 * instead of silently running against whatever DATABASE_URL points at.
 * `prisma generate` needs no connection and works without it.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
