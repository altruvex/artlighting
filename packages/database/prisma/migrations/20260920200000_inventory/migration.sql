-- Inventory.
--
-- Stock was a single Int on ProductVariant. A number with no history cannot
-- answer the questions an ERP exists for: why did it change, who changed it,
-- what is promised to an order that has not shipped, and what may a customer
-- still buy. So: a location, a per-variant-per-location item, and an
-- append-only ledger of every movement.
--
-- `available` is deliberately not a column. It is onHand - reserved,
-- computed on read, because a third stored number is a third thing that can
-- disagree with the other two.
--
-- Additive: ProductVariant.stock and Product.quantity are untouched and stay
-- as mirrors until the apps read InventoryItem.

-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'TRANSFER_IN', 'TRANSFER_OUT');
-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "inventory_location_translations" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "inventory_location_translations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "incoming" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "onHandAfter" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "orderId" INTEGER,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "inventory_locations_code_key" ON "inventory_locations"("code");
-- CreateIndex
CREATE INDEX "inventory_locations_isActive_idx" ON "inventory_locations"("isActive");
-- CreateIndex
CREATE INDEX "inventory_location_translations_language_idx" ON "inventory_location_translations"("language");
-- CreateIndex
CREATE UNIQUE INDEX "inventory_location_translations_locationId_language_key" ON "inventory_location_translations"("locationId", "language");
-- CreateIndex
CREATE INDEX "inventory_items_variantId_idx" ON "inventory_items"("variantId");
-- CreateIndex
CREATE INDEX "inventory_items_locationId_idx" ON "inventory_items"("locationId");
-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_variantId_locationId_key" ON "inventory_items"("variantId", "locationId");
-- CreateIndex
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");
-- CreateIndex
CREATE INDEX "stock_movements_itemId_createdAt_idx" ON "stock_movements"("itemId", "createdAt" DESC);
-- CreateIndex
CREATE INDEX "stock_movements_orderId_idx" ON "stock_movements"("orderId");
-- CreateIndex
CREATE INDEX "stock_movements_kind_idx" ON "stock_movements"("kind");
-- AddForeignKey
ALTER TABLE "inventory_location_translations" ADD CONSTRAINT "inventory_location_translations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invariants enforced by the database, not only by the service. A bug in
-- the application should not be able to leave the ledger describing an
-- impossible warehouse.
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_onHand_not_negative" CHECK ("onHand" >= 0),
  ADD CONSTRAINT "inventory_items_reserved_not_negative" CHECK ("reserved" >= 0),
  ADD CONSTRAINT "inventory_items_incoming_not_negative" CHECK ("incoming" >= 0),
  -- You cannot promise units you do not physically have.
  ADD CONSTRAINT "inventory_items_reserved_within_onHand" CHECK ("reserved" <= "onHand");

ALTER TABLE "stock_movements"
  -- A movement of zero is not an event.
  ADD CONSTRAINT "stock_movements_quantity_not_zero" CHECK ("quantity" <> 0),
  ADD CONSTRAINT "stock_movements_onHandAfter_not_negative" CHECK ("onHandAfter" >= 0),
  ADD CONSTRAINT "stock_movements_reservedAfter_not_negative" CHECK ("reservedAfter" >= 0);

-- Exactly one default location. A partial unique index rather than a
-- boolean nobody enforces: two defaults is a silent source of "stock went
-- to the wrong place".
CREATE UNIQUE INDEX "inventory_locations_one_default"
  ON "inventory_locations" ("isDefault") WHERE "isDefault";
