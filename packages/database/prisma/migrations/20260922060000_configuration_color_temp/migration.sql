-- The customer's colour temperature moves onto their configuration.
--
-- The storefront wrote the chosen colour temperature onto the product row,
-- from a server action anyone could call. One visitor's click changed the
-- product for everybody, and an order recorded whichever colour the last
-- visitor had clicked, not the one its customer chose.
--
-- Nullable: until a customer chooses, the product's own default stands.

-- AlterTable
ALTER TABLE "configurations" ADD COLUMN "colorTemp" "ProductColorTemp";
