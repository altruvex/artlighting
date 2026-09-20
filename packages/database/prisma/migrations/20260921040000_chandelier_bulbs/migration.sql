-- CreateEnum
CREATE TYPE "BulbBase" AS ENUM ('E27', 'E14');

-- AlterTable
ALTER TABLE "configurations" ADD COLUMN     "bulbId" TEXT;

-- CreateTable
CREATE TABLE "bulbs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "wattage" INTEGER NOT NULL,
    "base" "BulbBase" NOT NULL DEFAULT 'E27',
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulbs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulb_translations" (
    "id" TEXT NOT NULL,
    "bulbId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "bulb_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bulbs" (
    "productId" TEXT NOT NULL,
    "bulbId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_bulbs_pkey" PRIMARY KEY ("productId","bulbId")
);

-- CreateIndex
CREATE UNIQUE INDEX "bulbs_key_key" ON "bulbs"("key");

-- CreateIndex
CREATE INDEX "bulbs_isActive_position_idx" ON "bulbs"("isActive", "position");

-- CreateIndex
CREATE INDEX "bulb_translations_language_idx" ON "bulb_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "bulb_translations_bulbId_language_key" ON "bulb_translations"("bulbId", "language");

-- CreateIndex
CREATE INDEX "product_bulbs_bulbId_idx" ON "product_bulbs"("bulbId");

-- CreateIndex
CREATE INDEX "configurations_bulbId_idx" ON "configurations"("bulbId");

-- AddForeignKey
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_bulbId_fkey" FOREIGN KEY ("bulbId") REFERENCES "bulbs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulb_translations" ADD CONSTRAINT "bulb_translations_bulbId_fkey" FOREIGN KEY ("bulbId") REFERENCES "bulbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bulbs" ADD CONSTRAINT "product_bulbs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bulbs" ADD CONSTRAINT "product_bulbs_bulbId_fkey" FOREIGN KEY ("bulbId") REFERENCES "bulbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A chandelier with arms is sold with exactly one bulb. Two defaults would
-- make its price depend on which row came back first, so the database
-- refuses them rather than leaving it to the code that writes them.
CREATE UNIQUE INDEX "product_bulbs_one_default_per_product"
  ON "product_bulbs" ("productId")
  WHERE "isDefault";

-- A bulb is a real fitting: a negative price is a data-entry slip, and a
-- zero-watt bulb is not a bulb.
ALTER TABLE "bulbs"
  ADD CONSTRAINT "bulbs_price_not_negative" CHECK ("price" >= 0),
  ADD CONSTRAINT "bulbs_wattage_positive"   CHECK ("wattage" > 0);
