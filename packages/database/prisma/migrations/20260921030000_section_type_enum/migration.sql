-- products.sectionType becomes the ProductFamily enum.
--
-- It was a free String holding exactly three values, which meant a typo was
-- a valid row and a query for "Indoor" silently matched nothing. It also
-- happened to be spelled the same as the URL segment, and that coincidence
-- is what hid the absence of any boundary between a stored value and a
-- route: pages passed `params.subCategory` straight into a `where`.
--
-- The enum values are upper-case like every other enum in this schema, so
-- the database value and the URL segment are now deliberately different
-- strings. FAMILY_SLUGS in @repo/catalog is the only bridge, and the URLs
-- themselves do not change: /category/balcom/indoor still resolves.
--
-- ProductFamily already exists — it was added for discount targeting, with
-- familyOf() mapping between the two. After this that function is gone,
-- because there is nothing left to map.
--
-- Pre-checked on this database: 57 chandelier, 49 indoor, 12 outdoor, no
-- case or whitespace variants and no value outside the three. The guard
-- repeats that check and aborts rather than dropping rows into a cast that
-- would fail halfway.
DO $$
DECLARE bad INT;
BEGIN
  SELECT count(*) INTO bad
    FROM "products"
   WHERE lower(btrim("sectionType")) NOT IN ('indoor', 'outdoor', 'chandelier');
  IF bad > 0 THEN
    RAISE EXCEPTION
      '% product(s) have a sectionType outside indoor/outdoor/chandelier; normalise them before converting', bad;
  END IF;
END $$;

-- Normalise first, so the cast below cannot be the thing that fails.
UPDATE "products" SET "sectionType" = lower(btrim("sectionType"));

ALTER TABLE "products"
  ALTER COLUMN "sectionType" TYPE "ProductFamily"
  USING upper("sectionType")::"ProductFamily";
