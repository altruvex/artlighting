-- products.discount goes.
--
-- It held a rate per product, which is why a promotion could not have a
-- name, a date window, a minimum order, a usage limit or a scope: there was
-- nowhere on a product row to put any of that. Its values are now Discount
-- rows, and every reader — the product page, the listings, search, the
-- cart, the Excel export, the configuration snapshot and the checkout —
-- goes through @repo/pricing.
--
-- Verified before writing this: setting the column to 0 on all 118 products
-- changed nothing the storefront renders, in either language. The numbers
-- were already coming from the engine.
--
-- The guard below refuses to drop the column while any product still
-- carries a rate that no Discount row covers, so a database in a different
-- state than this one does not silently lose a promotion.
DO $$
DECLARE uncovered INT;
BEGIN
  SELECT count(*) INTO uncovered
    FROM "products" p
   WHERE p."discount" > 0
     AND NOT EXISTS (
       SELECT 1 FROM "discount_products" dp
         JOIN "discounts" d ON d."id" = dp."discountId"
        WHERE dp."productId" = p."id" AND d."rate" = p."discount"
     );
  IF uncovered > 0 THEN
    RAISE EXCEPTION
      '% product(s) still carry a discount that no Discount row covers; run backfill:discounts first', uncovered;
  END IF;
END $$;

ALTER TABLE "products" DROP COLUMN "discount";
