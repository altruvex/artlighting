-- A spec item gains a language-neutral key.
--
-- Without one, a spec could only be addressed by its translated label or by
-- its position in a group. That is why the storefront looked up
-- specificationsTable["Energy Saving"] by an English string: on the Arabic
-- page the map is keyed in Arabic, so the lookup found nothing and six
-- sentences rendered with holes in them, and parseInt(undefined) made an
-- IP65 outdoor fixture describe itself as indoor-only.

-- AlterTable
ALTER TABLE "spec_items" ADD COLUMN     "key" TEXT;
-- CreateIndex
CREATE INDEX "spec_items_key_idx" ON "spec_items"("key");
