-- Whether orders reserve and sell a product's stock.
--
-- Orders now reserve stock on confirmation and refuse to oversell. That is
-- right for a product counted on a shelf and wrong for one made or bought
-- in to order — LED strip sold by the metre, a chandelier for a project —
-- where the count is not what limits a sale. Those can be marked untracked:
-- no reservation, no "only N left", never sold out.
--
-- Defaults to true, so every existing product behaves exactly as it does
-- now until someone turns it off.

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "trackInventory" BOOLEAN NOT NULL DEFAULT true;
