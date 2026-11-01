-- Carry Product.discount across to Discount rows, so the next migration
-- can drop the column without losing a promotion.
--
-- On the dev branch this was `backfill:discounts`, which was deleted with
-- the column (87f3ed6). A database that still carries the column
-- (production, 2026-11-01: 61 products at 13%, 56 at 30%, 0 Discount rows)
-- has no script left to run, so this does the same thing here:
--
--   * one AUTOMATIC, PERCENTAGE, PRODUCTS-scoped, non-stackable discount per
--     distinct rate, always on, no limits — exactly how a per-product rate
--     behaved
--   * the same deterministic id the script used (migrated_rate_0_1300), so
--     a database the script already ran on is updated, not duplicated
--   * its product list replaced, not appended, so it matches the column
--
-- A no-op where products.discount is gone (the dev branch).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'products' AND column_name = 'discount'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $sql$
    CREATE TEMP TABLE migrated_rates ON COMMIT DROP AS
    SELECT DISTINCT round("discount", 4) AS rate,
           'migrated_rate_' || replace(to_char(round("discount", 4), 'FM0.0000'), '.', '_') AS id
      FROM "products"
     WHERE "discount" > 0
  $sql$;

  INSERT INTO "discounts" ("id", "name", "type", "mode", "scope", "rate", "stackable", "isActive", "updatedAt")
  SELECT id,
         trim(trailing '.' from trim(trailing '0' from to_char(rate * 100, 'FM990.00'))) || '% off (migrated)',
         'PERCENTAGE', 'AUTOMATIC', 'PRODUCTS', rate, false, true, CURRENT_TIMESTAMP
    FROM migrated_rates
  ON CONFLICT ("id") DO UPDATE
     SET "name" = EXCLUDED."name", "rate" = EXCLUDED."rate", "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

  DELETE FROM "discount_products" WHERE "discountId" IN (SELECT id FROM migrated_rates);

  EXECUTE $sql$
    INSERT INTO "discount_products" ("discountId", "productId")
    SELECT m.id, p."id"
      FROM "products" p
      JOIN migrated_rates m ON m.rate = round(p."discount", 4)
  $sql$;
END $$;
