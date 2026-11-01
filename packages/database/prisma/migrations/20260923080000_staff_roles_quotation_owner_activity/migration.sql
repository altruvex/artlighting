-- Staff roles, quotation ownership and the quotation activity log.

-- Roles: the two old values are renamed in place, so every existing admin
-- keeps what they could do (ADMIN → MANAGER, STAFF → SALES), and two roles
-- are added. The new values are not used in this migration, which is what
-- lets ADD VALUE run inside its transaction.
ALTER TYPE "AdminRole" RENAME VALUE 'ADMIN' TO 'MANAGER';
ALTER TYPE "AdminRole" RENAME VALUE 'STAFF' TO 'SALES';
ALTER TYPE "AdminRole" ADD VALUE 'ENGINEERING';
ALTER TYPE "AdminRole" ADD VALUE 'ACCOUNTS';
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'SALES';

-- Owner: every existing quotation belongs to whoever created it.
ALTER TABLE "quotations" ADD COLUMN "ownerId" TEXT;
UPDATE "quotations" SET "ownerId" = "createdById";
ALTER TABLE "quotations" ALTER COLUMN "ownerId" SET NOT NULL;
CREATE INDEX "quotations_ownerId_idx" ON "quotations"("ownerId");
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Activity log.
CREATE TYPE "QuotationActivityAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'REVISED', 'ASSIGNED', 'DOCUMENT_EXPORTED');

CREATE TABLE "quotation_activity" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" "QuotationActivityAction" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotation_activity_quotationId_createdAt_idx" ON "quotation_activity"("quotationId", "createdAt");
CREATE INDEX "quotation_activity_actorId_idx" ON "quotation_activity"("actorId");
ALTER TABLE "quotation_activity" ADD CONSTRAINT "quotation_activity_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_activity" ADD CONSTRAINT "quotation_activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
