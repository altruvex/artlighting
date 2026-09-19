-- Binds an anonymous configuration to the browser that created it.
--
-- cuid ids are not a secret: they carry a millisecond timestamp, a
-- sequential counter and a per-process constant, so only part of the id is
-- random. The guest token (a random value in an httpOnly cookie) is what
-- decides who may change or claim a configuration that has no userId yet.

-- AlterTable
ALTER TABLE "configurations" ADD COLUMN "guestToken" TEXT;

-- CreateIndex
CREATE INDEX "configurations_guestToken_idx" ON "configurations"("guestToken");
