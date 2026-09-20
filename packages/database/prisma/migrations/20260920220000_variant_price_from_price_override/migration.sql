-- ProductVariant.price takes over from priceOverride.
--
-- `price` was added with the Phase 2 catalog migration but nothing wrote to
-- it, so the old column was still the one in use. Copying first means the
-- drop that follows loses nothing.
--
-- Only rows where `price` is still empty are copied, so a re-run cannot
-- overwrite a price set through the new column.
UPDATE "product_variants"
   SET "price" = "priceOverride"
 WHERE "priceOverride" IS NOT NULL
   AND "price" IS NULL;
