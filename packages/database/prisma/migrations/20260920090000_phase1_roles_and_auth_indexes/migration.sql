-- Phase 1: role rename, customer role, unused columns, Better Auth indexes.
--
-- The enum change is an in-place RENAME VALUE, not Prisma's generated
-- create-new-type-and-cast: that cast (role::text::"AdminRole_new") fails on
-- every existing row, because 'owner' is not a value of the new type.
-- RENAME VALUE keeps the enum's OIDs, so stored rows and the column default
-- stay valid.

-- AlterEnum: owner -> ADMIN, staff -> STAFF
ALTER TYPE "AdminRole" RENAME VALUE 'owner' TO 'ADMIN';
ALTER TYPE "AdminRole" RENAME VALUE 'staff' TO 'STAFF';
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- CreateEnum: customer-side role (CUSTOMER only today)
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER');

-- AlterTable: customers get a role
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable: drop the stray User -> Configuration / Product links.
-- Verified on this database before writing: 0 of 2 user rows had either set,
-- and no application code reads them.
ALTER TABLE "users" DROP CONSTRAINT "users_configurationId_fkey";
ALTER TABLE "users" DROP CONSTRAINT "users_productId_fkey";
ALTER TABLE "users" DROP COLUMN "configurationId";
ALTER TABLE "users" DROP COLUMN "productId";

-- CreateIndex: foreign keys and lookup columns Better Auth 1.7 expects
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");
CREATE INDEX "admin_sessions_adminId_idx" ON "admin_sessions"("adminId");
CREATE INDEX "admin_accounts_adminId_idx" ON "admin_accounts"("adminId");
CREATE INDEX "admin_verifications_identifier_idx" ON "admin_verifications"("identifier");
