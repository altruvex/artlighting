-- Configuration ownership.
--
-- Configurations are created while a visitor is still anonymous, so the
-- column is nullable: the first authenticated write claims the row, and
-- from then on only that customer may change it. Before this, the update
-- endpoint accepted any configuration id from anyone.

-- AlterTable
ALTER TABLE "configurations" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "configurations_userId_idx" ON "configurations"("userId");

-- AddForeignKey
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
