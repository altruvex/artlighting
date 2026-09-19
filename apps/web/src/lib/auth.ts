import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/database";
import { getAuthSecret } from "./auth-secret";

/**
 * Customer identity for apps/web. Uses the existing User/Session/Account/
 * Verification models directly (User already carries Better Auth's required
 * name/email/emailVerified/image fields plus the app's own profile fields —
 * see packages/database/prisma/schema.prisma) — no separate auth-only table.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: getAuthSecret(),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: false },
      preferredLanguage: { type: "string", required: false, defaultValue: "ar" },
      preferredCurrency: { type: "string", required: false, defaultValue: "EGP" },
    },
  },
});
