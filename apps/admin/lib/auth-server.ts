import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
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
      // input:false — never settable through /sign-up or /update-user; only
      // createStaffAccount / updateAdminRole write it, server side.
      role: { type: "string", required: false, defaultValue: "SALES", input: false },
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
  hooks: {
    // There is no public sign-up: accounts are created by a manager through
    // createStaffAccount, which calls auth.api.signUpEmail directly (no HTTP
    // request). Any sign-up arriving over HTTP is refused.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.request) {
        throw new APIError("FORBIDDEN", { message: "Sign-up is disabled" });
      }
    }),
  },
});
