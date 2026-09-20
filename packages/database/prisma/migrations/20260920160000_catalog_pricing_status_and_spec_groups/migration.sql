-- Phase 2 §3.3: catalog pricing, product lifecycle, and structured specs.
--
-- Everything here is additive: no column is dropped and no value is cast,
-- so the running storefront and admin keep working unchanged.
--
-- `products.status` replaces the isActive/deletedAt pair as the single
-- lifecycle field. The derivation at the bottom runs inside this migration
-- rather than as a separate backfill, so no row is ever briefly wrong:
-- deleted -> ARCHIVED, inactive -> DRAFT, everything else -> ACTIVE.
-- Both old columns stay in step until the apps read `status`, and they are
-- dropped later in their own migration.
--
-- `product_variants.price` replaces `priceOverride`, and
-- `spec_groups`/`spec_items` replace ProductSpecification's fixed columns;
-- the old ones stay until their readers move.

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;
-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "compareAtPrice" DECIMAL(12,2),
ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "price" DECIMAL(12,2);
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "compareAtPrice" DECIMAL(12,2),
ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';
-- CreateTable
CREATE TABLE "spec_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spec_groups_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "spec_group_translations" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "spec_group_translations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "spec_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spec_items_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "spec_item_translations" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "spec_item_translations_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "spec_groups_productId_idx" ON "spec_groups"("productId");
-- CreateIndex
CREATE INDEX "spec_groups_productId_position_idx" ON "spec_groups"("productId", "position");
-- CreateIndex
CREATE INDEX "spec_group_translations_language_idx" ON "spec_group_translations"("language");
-- CreateIndex
CREATE UNIQUE INDEX "spec_group_translations_groupId_language_key" ON "spec_group_translations"("groupId", "language");
-- CreateIndex
CREATE INDEX "spec_items_groupId_idx" ON "spec_items"("groupId");
-- CreateIndex
CREATE INDEX "spec_items_groupId_position_idx" ON "spec_items"("groupId", "position");
-- CreateIndex
CREATE INDEX "spec_item_translations_language_idx" ON "spec_item_translations"("language");
-- CreateIndex
CREATE UNIQUE INDEX "spec_item_translations_itemId_language_key" ON "spec_item_translations"("itemId", "language");
-- CreateIndex
CREATE INDEX "product_variants_productId_position_idx" ON "product_variants"("productId", "position");
-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");
-- AddForeignKey
ALTER TABLE "spec_groups" ADD CONSTRAINT "spec_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "spec_group_translations" ADD CONSTRAINT "spec_group_translations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "spec_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "spec_items" ADD CONSTRAINT "spec_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "spec_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "spec_item_translations" ADD CONSTRAINT "spec_item_translations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "spec_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Derive the lifecycle field from the columns it replaces.
UPDATE "products" SET "status" = 'ARCHIVED' WHERE "deletedAt" IS NOT NULL;
UPDATE "products" SET "status" = 'DRAFT'    WHERE "deletedAt" IS NULL AND "isActive" = false;
UPDATE "products" SET "status" = 'ACTIVE'   WHERE "deletedAt" IS NULL AND "isActive" = true;
