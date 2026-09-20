-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bulbId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_bulbId_fkey" FOREIGN KEY ("bulbId") REFERENCES "bulbs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Nothing is backfilled. Orders placed before this had no bulb choice to
-- record: Order.productChandLamp only ever held the product's unused
-- default, so inventing a value here would be guessing what a past
-- customer bought. Old orders keep reading from that string.
