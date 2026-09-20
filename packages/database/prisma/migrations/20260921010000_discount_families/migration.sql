-- Discounts can target a product family.
--
-- "Every outdoor fixture" is a thing a promotion wants to say, and no list
-- of categories says it as directly — a category list has to be revisited
-- every time a category is added, and a family does not.
--
-- ProductFamily mirrors `products.sectionType`, which is still a String.
-- That seam is deliberate and temporary: converting sectionType to this
-- enum touches routing and every catalogue query, so it is its own
-- migration. Until then `familyOf()` in @repo/catalog is the only place
-- that maps between the two.
CREATE TYPE "ProductFamily" AS ENUM ('INDOOR', 'OUTDOOR', 'CHANDELIER');

ALTER TYPE "DiscountScope" ADD VALUE 'FAMILIES';

CREATE TABLE "discount_families" (
    "discountId" TEXT NOT NULL,
    "family"     "ProductFamily" NOT NULL,
    CONSTRAINT "discount_families_pkey" PRIMARY KEY ("discountId","family")
);

CREATE INDEX "discount_families_family_idx" ON "discount_families"("family");

ALTER TABLE "discount_families"
  ADD CONSTRAINT "discount_families_discountId_fkey"
  FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
