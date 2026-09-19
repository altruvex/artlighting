import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/database";
import { deliverAuthEmail } from "./auth-email";
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
    // Password reset is wired here; the message itself is sent by
    // lib/auth-email.ts, which gets a real provider in Phase 5.
    sendResetPassword: async ({ user, url }) => {
      await deliverAuthEmail({ kind: "reset-password", to: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Customers can use the site before verifying: nothing sends the mail
    // yet, so requiring it would lock everyone out. Phase 5 turns this on.
    sendVerificationEmail: async ({ user, url }) => {
      await deliverAuthEmail({ kind: "verify-email", to: user.email, url });
    },
  },
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: false },
      preferredLanguage: { type: "string", required: false, defaultValue: "ar" },
      preferredCurrency: { type: "string", required: false, defaultValue: "EGP" },
    },
  },
});
