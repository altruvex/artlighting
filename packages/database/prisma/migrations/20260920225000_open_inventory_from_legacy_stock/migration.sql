-- Open the inventory ledger from ProductVariant.stock, so the next
-- migration can drop that column without losing a quantity.
--
-- On the dev branch this was done by `backfill:inventory` before the column
-- was dropped. That script has since been rewritten to open new variants at
-- zero, because the column it read is gone — so a database still carrying
-- the column (production, 2026-11-01: 117 variants, 1170 units, 0 inventory
-- rows) has no script left that can carry its stock across. This does it
-- here instead, the way the original script did:
--
--   * one inventory item per variant at the default location ("main"),
--     onHand = stock, reorderPoint = the product's lowStockThreshold
--   * one RECEIPT movement per non-zero opening balance, so the ledger does
--     not start with a balance nothing accounts for
--
-- Idempotent and a no-op where it has nothing to do: it runs only while
-- product_variants.stock exists (so the dev branch, where it is gone, skips
-- it) and only for variants that have no inventory item yet.

DO $$
DECLARE location_id TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'product_variants' AND column_name = 'stock'
  ) THEN
    RETURN;
  END IF;

  SELECT "id" INTO location_id FROM "inventory_locations" WHERE "code" = 'main';
  IF location_id IS NULL THEN
    location_id := gen_random_uuid()::text;
    INSERT INTO "inventory_locations" ("id", "code", "name", "isDefault", "updatedAt")
    VALUES (location_id, 'main', 'Main warehouse', true, CURRENT_TIMESTAMP);
    INSERT INTO "inventory_location_translations" ("id", "locationId", "language", "name")
    VALUES (gen_random_uuid()::text, location_id, 'en', 'Main warehouse'),
           (gen_random_uuid()::text, location_id, 'ar', 'المخزن الرئيسي');
  END IF;

  -- EXECUTE, because "stock" does not exist on a database that skips this
  -- block, and a static reference would fail to plan there.
  EXECUTE format($sql$
    WITH opened AS (
      INSERT INTO "inventory_items" ("id", "variantId", "locationId", "onHand", "reorderPoint", "updatedAt")
      SELECT gen_random_uuid()::text, v."id", %L, v."stock", p."lowStockThreshold", CURRENT_TIMESTAMP
        FROM "product_variants" v
        JOIN "products" p ON p."id" = v."productId"
       WHERE NOT EXISTS (SELECT 1 FROM "inventory_items" i WHERE i."variantId" = v."id")
      RETURNING "id", "onHand"
    )
    INSERT INTO "stock_movements" ("id", "itemId", "kind", "quantity", "onHandAfter", "reservedAfter", "reason", "actorId")
    SELECT gen_random_uuid()::text, "id", 'RECEIPT', "onHand", "onHand", 0,
           'Opening balance, migrated from ProductVariant.stock', 'system'
      FROM opened
     WHERE "onHand" <> 0
  $sql$, location_id);
END $$;
