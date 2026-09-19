/**
 * One-time bootstrap: creates the initial OWNER Admin account via Better
 * Auth's own signup (so the password is hashed exactly the way Better Auth
 * expects, not hand-rolled), then promotes it to role ADMIN (signup
 * defaults everyone to STAFF — see apps/admin/lib/auth-server.ts).
 *
 * Requires, in the environment this is run with (not committed anywhere):
 *   DATABASE_URL         - already in packages/database/.env
 *   BETTER_AUTH_SECRET    - same secret apps/admin's Better Auth instance uses
 *   ADMIN_EMAIL           - email for the admin account
 *   ADMIN_PASSWORD         - password for the admin account (min 8 chars)
 *   ADMIN_NAME             - display name (optional, defaults to "Owner")
 *
 * Run once: `pnpm --filter @repo/database seed:admin`
 * If an Admin with that email already exists, this just promotes it to
 * ADMIN rather than erroring.
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../index";

async function main() {
  const { BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!BETTER_AUTH_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Missing one of BETTER_AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD in the environment. " +
        "These are only needed for this one-time run, not stored anywhere by this script."
    );
  }

  // Same config as apps/admin/lib/auth-server.ts — duplicated here rather
  // than imported cross-package, since apps/admin isn't a dependency of
  // packages/database.
  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    user: {
      modelName: "admin",
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "STAFF" },
      },
    },
    session: { modelName: "adminSession", fields: { userId: "adminId" } },
    account: { modelName: "adminAccount", fields: { userId: "adminId" } },
    verification: { modelName: "adminVerification" },
  });

  const existing = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!existing) {
    await auth.api.signUpEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME || "Owner" },
    });
  }

  const admin = await prisma.admin.update({
    where: { email: ADMIN_EMAIL },
    data: { role: "ADMIN" },
  });

  console.log(`Owner admin ready: ${admin.email} (id=${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
