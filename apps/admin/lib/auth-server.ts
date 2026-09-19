import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/database";
import { getAuthSecret } from "./auth-secret";

/**
 * Admin identity — a separate pool from apps/web's customer identity, backed
 * by the Admin/AdminSession/AdminAccount/AdminVerification models (own
 * tables, not shared with users/sessions/accounts). `role` rides along as an
 * additional field on the Admin model.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: getAuthSecret(),
  // BETTER_AUTH_URL only: NEXT_PUBLIC_APP_URL is the storefront's URL, so
  // falling back to it would send admin auth callbacks to the wrong app.
  // Unset, Better Auth derives the origin from the request (same-origin).
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "admin",
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "staff" },
    },
  },
  session: {
    modelName: "adminSession",
    fields: { userId: "adminId" },
  },
  account: {
    modelName: "adminAccount",
    fields: { userId: "adminId" },
  },
  verification: {
    modelName: "adminVerification",
  },
});
