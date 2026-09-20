-- ProductTranslation and ProductSpecification stop being keyed on the SKU.
--
-- Both pointed at `products."productId"` — the SKU string, a value the
-- business owns and may want to change. That made a SKU effectively
-- unrenameable: the rename cascades through two tables, and every join went
-- through a mutable business key instead of the row's identity. Every other
-- relation in this schema already uses `products.id`.
--
-- The column keeps its name and changes what it holds: the SKU becomes the
-- cuid. Pre-checked on this database first — 234 translation rows and 232
-- specification rows, no orphan SKU, and no collision on the new
-- (product, language) unique. The guard below repeats that check at run
-- time and aborts the whole migration rather than half-converting.

-- ── product_translations ──────────────────────────────────────
ALTER TABLE "product_translations" ADD COLUMN "productRef" TEXT;

UPDATE "product_translations" t
   SET "productRef" = p."id"
  FROM "products" p
 WHERE p."productId" = t."productId";

DO $$
DECLARE unmapped INT;
BEGIN
  SELECT count(*) INTO unmapped FROM "product_translations" WHERE "productRef" IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'product_translations: % row(s) have a productId that matches no product; aborting', unmapped;
  END IF;
END $$;

ALTER TABLE "product_translations" DROP CONSTRAINT IF EXISTS "product_translations_productId_fkey";
DROP INDEX IF EXISTS "product_translations_productId_language_key";
DROP INDEX IF EXISTS "idx_product_translation_product_language";
ALTER TABLE "product_translations" DROP COLUMN "productId";
ALTER TABLE "product_translations" RENAME COLUMN "productRef" TO "productId";
ALTER TABLE "product_translations" ALTER COLUMN "productId" SET NOT NULL;

CREATE UNIQUE INDEX "product_translations_productId_language_key"
  ON "product_translations"("productId", "language");
CREATE INDEX "idx_product_translation_product_language"
  ON "product_translations"("productId", "language");
ALTER TABLE "product_translations"
  ADD CONSTRAINT "product_translations_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── product_specifications ────────────────────────────────────
ALTER TABLE "product_specifications" ADD COLUMN "productRef" TEXT;

UPDATE "product_specifications" s
   SET "productRef" = p."id"
  FROM "products" p
 WHERE p."productId" = s."productId";

DO $$
DECLARE unmapped INT;
BEGIN
  SELECT count(*) INTO unmapped FROM "product_specifications" WHERE "productRef" IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'product_specifications: % row(s) have a productId that matches no product; aborting', unmapped;
  END IF;
END $$;

ALTER TABLE "product_specifications" DROP CONSTRAINT IF EXISTS "product_specifications_productId_fkey";
DROP INDEX IF EXISTS "product_specifications_productId_language_key";
DROP INDEX IF EXISTS "product_specifications_productId_idx";
DROP INDEX IF EXISTS "idx_product_spec_product_language";
ALTER TABLE "product_specifications" DROP COLUMN "productId";
ALTER TABLE "product_specifications" RENAME COLUMN "productRef" TO "productId";
ALTER TABLE "product_specifications" ALTER COLUMN "productId" SET NOT NULL;

CREATE UNIQUE INDEX "product_specifications_productId_language_key"
  ON "product_specifications"("productId", "language");
CREATE INDEX "product_specifications_productId_idx"
  ON "product_specifications"("productId");
CREATE INDEX "idx_product_spec_product_language"
  ON "product_specifications"("productId", "language");
ALTER TABLE "product_specifications"
  ADD CONSTRAINT "product_specifications_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
