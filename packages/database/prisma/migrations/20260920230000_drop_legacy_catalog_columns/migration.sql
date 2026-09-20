-- Retire four columns whose data now lives somewhere better.
--
--   products.quantity            -> inventory_items.onHand (via the ledger)
--   products.productImages[]     -> product_images
--   product_variants.stock       -> inventory_items.onHand
--   product_variants.priceOverride -> product_variants.price
--
-- Keeping both of each was the maintenance cost: every write had to happen
-- twice, and any path that forgot left the two disagreeing.
--
-- NOT dropped: orders.productImages. That is a snapshot taken when the order
-- was placed, not a duplicate — an invoice must still show what the customer
-- actually bought after the product's images are replaced.
--
-- products.discount also stays: its replacement is the Discount model in
-- Phase 3, which does not exist yet, so there is nowhere correct to put it.
--
-- Verified on this database before writing: 118 variants, 118 inventory
-- rows, 0 variants without one, 0 whose stock disagrees with the ledger,
-- 117 products with legacy images and 0 whose images are missing from
-- product_images, and 0 rows still using priceOverride. The guards below
-- repeat every one of those checks and abort rather than lose a number.

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n
    FROM "product_variants" v
    LEFT JOIN "inventory_items" i ON i."variantId" = v."id"
   WHERE i."id" IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION '% variant(s) have no inventory row; dropping stock would lose their quantity', n;
  END IF;

  SELECT count(*) INTO n
    FROM "product_variants" v
    JOIN "inventory_items" i ON i."variantId" = v."id"
   WHERE v."stock" <> i."onHand";
  IF n > 0 THEN
    RAISE EXCEPTION '% variant(s) have a stock that disagrees with the ledger; reconcile before dropping', n;
  END IF;

  SELECT count(*) INTO n
    FROM "products" p
   WHERE array_length(p."productImages", 1) > 0
     AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."productId" = p."id");
  IF n > 0 THEN
    RAISE EXCEPTION '% product(s) have legacy images that are not in product_images; run backfill:images first', n;
  END IF;

  SELECT count(*) INTO n
    FROM "product_variants"
   WHERE "priceOverride" IS NOT NULL AND "price" IS DISTINCT FROM "priceOverride";
  IF n > 0 THEN
    RAISE EXCEPTION '% variant(s) still carry a priceOverride that was not copied to price', n;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "priceOverride",
DROP COLUMN "stock";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "productImages",
DROP COLUMN "quantity";
