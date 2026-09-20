-- Phase 2 follow-up: spec values become structured.
--
-- Before this, every spec value was a string typed once in English and once
-- in Arabic. That is how jy-202-15w ended up claiming "1320LM (3000k) /
-- 1400LM (6500k)" in English and "٦٢٠ لومن/متر" in Arabic: two independently
-- editable strings for one physical fact, with nothing to keep them honest.
--
-- A figure is now a number with a unit, and a measurement can carry the
-- condition it was taken at (luminous flux is measured once per colour
-- temperature, which is what that compound string was). A value that is a
-- choice rather than a number — material, driver, lamp base — points at a
-- shared SpecOption defined once and translated once.
--
-- Only TEXT still stores a per-language string, and it is the only kind that
-- can drift, which is why `spec_item_translations.value` becomes nullable.
--
-- Additive: no column dropped, no value cast. Existing rows keep their
-- strings and default to kind = TEXT until the backfill parses them.

-- CreateEnum
CREATE TYPE "SpecValueKind" AS ENUM ('MEASUREMENT', 'RANGE', 'CHOICE', 'TEXT');
-- CreateEnum
CREATE TYPE "SpecComparator" AS ENUM ('EXACT', 'AT_LEAST', 'AT_MOST', 'APPROX');
-- AlterTable
ALTER TABLE "spec_item_translations" ALTER COLUMN "value" DROP NOT NULL;
-- AlterTable
ALTER TABLE "spec_items" ADD COLUMN     "comparator" "SpecComparator" NOT NULL DEFAULT 'EXACT',
ADD COLUMN     "kind" "SpecValueKind" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "optionId" TEXT;
-- CreateTable
CREATE TABLE "spec_measurements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "value" DECIMAL(14,4) NOT NULL,
    "valueMax" DECIMAL(14,4),
    "conditionValue" DECIMAL(14,4),
    "conditionUnit" TEXT,
    CONSTRAINT "spec_measurements_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "spec_options" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spec_options_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "spec_option_translations" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "spec_option_translations_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "spec_measurements_itemId_idx" ON "spec_measurements"("itemId");
-- CreateIndex
CREATE INDEX "spec_measurements_itemId_position_idx" ON "spec_measurements"("itemId", "position");
-- CreateIndex
CREATE UNIQUE INDEX "spec_options_key_key" ON "spec_options"("key");
-- CreateIndex
CREATE INDEX "spec_option_translations_language_idx" ON "spec_option_translations"("language");
-- CreateIndex
CREATE UNIQUE INDEX "spec_option_translations_optionId_language_key" ON "spec_option_translations"("optionId", "language");
-- CreateIndex
CREATE INDEX "spec_items_optionId_idx" ON "spec_items"("optionId");
-- AddForeignKey
ALTER TABLE "spec_items" ADD CONSTRAINT "spec_items_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "spec_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "spec_measurements" ADD CONSTRAINT "spec_measurements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "spec_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "spec_option_translations" ADD CONSTRAINT "spec_option_translations_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "spec_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
