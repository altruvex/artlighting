-- Phase 3: discounts become a promotion engine.
--
-- The old shape held one product id and one category id per row, so a
-- promotion covering ten products needed ten rows that could drift apart,
-- and it had no name, no limits, no stacking rule and no record of who
-- redeemed what.
--
-- The enum values are renamed in place rather than recreated and cast:
-- Prisma's generated `scope::text::"DiscountScope_new"` fails on every
-- existing row, and this database's discounts table happens to be empty
-- while production's may not be.
--
-- `value` is split into two columns. It used to hold a percentage or an
-- amount depending on `type` — one column whose meaning depends on another
-- column is exactly how a cart came to charge 0.13% instead of 13%. A
-- percentage is now a `rate` on the same 5,4 scale as every other rate in
-- the schema, an amount is `amount`, and a CHECK enforces that the right
-- one is set.

-- ── enums ─────────────────────────────────────────────────────
ALTER TYPE "DiscountType" RENAME VALUE 'percentage' TO 'PERCENTAGE';
ALTER TYPE "DiscountType" RENAME VALUE 'fixed' TO 'FIXED';

ALTER TYPE "DiscountScope" RENAME VALUE 'product' TO 'PRODUCTS';
ALTER TYPE "DiscountScope" RENAME VALUE 'category' TO 'CATEGORIES';
ALTER TYPE "DiscountScope" RENAME VALUE 'global' TO 'CART';

CREATE TYPE "DiscountMode" AS ENUM ('AUTOMATIC', 'COUPON');

-- ── new columns ───────────────────────────────────────────────
ALTER TABLE "discounts"
  ADD COLUMN "name"             TEXT,
  ADD COLUMN "mode"             "DiscountMode",
  ADD COLUMN "amount"           DECIMAL(12,2),
  ADD COLUMN "rate"             DECIMAL(5,4),
  ADD COLUMN "minOrderValue"    DECIMAL(12,2),
  ADD COLUMN "usageLimit"       INTEGER,
  ADD COLUMN "perCustomerLimit" INTEGER,
  ADD COLUMN "usageCount"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stackable"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "priority"         INTEGER NOT NULL DEFAULT 0;

-- Carry the old single `value` across. A percentage was stored as a whole
-- number (13 meaning 13%), so it becomes a rate.
UPDATE "discounts" SET "rate"   = ROUND("value" / 100, 4) WHERE "type" = 'PERCENTAGE';
UPDATE "discounts" SET "amount" = "value"                 WHERE "type" = 'FIXED';

-- A row with a code was a coupon; one without applied on its own.
UPDATE "discounts" SET "mode" = CASE WHEN "code" IS NULL THEN 'AUTOMATIC' ELSE 'COUPON' END::"DiscountMode";
UPDATE "discounts" SET "name" = COALESCE("code", 'Discount ' || left("id", 6)) WHERE "name" IS NULL;

ALTER TABLE "discounts"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "mode" SET NOT NULL;

-- Codes are matched case-insensitively, so they are stored upper-cased.
UPDATE "discounts" SET "code" = upper("code") WHERE "code" IS NOT NULL;

-- ── join tables ───────────────────────────────────────────────
CREATE TABLE "discount_products" (
    "discountId" TEXT NOT NULL,
    "productId"  TEXT NOT NULL,
    CONSTRAINT "discount_products_pkey" PRIMARY KEY ("discountId","productId")
);
CREATE TABLE "discount_categories" (
    "discountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "discount_categories_pkey" PRIMARY KEY ("discountId","categoryId")
);

-- Move the single-target rows into them before the columns go.
INSERT INTO "discount_products" ("discountId", "productId")
SELECT "id", "productId" FROM "discounts" WHERE "productId" IS NOT NULL;
INSERT INTO "discount_categories" ("discountId", "categoryId")
SELECT "id", "categoryId" FROM "discounts" WHERE "categoryId" IS NOT NULL;

ALTER TABLE "discounts" DROP CONSTRAINT IF EXISTS "discounts_categoryId_fkey";
ALTER TABLE "discounts" DROP CONSTRAINT IF EXISTS "discounts_productId_fkey";
DROP INDEX IF EXISTS "discounts_categoryId_idx";
DROP INDEX IF EXISTS "discounts_productId_idx";
DROP INDEX IF EXISTS "discounts_startsAt_endsAt_idx";
ALTER TABLE "discounts" DROP COLUMN "productId", DROP COLUMN "categoryId", DROP COLUMN "value";

-- ── redemptions ───────────────────────────────────────────────
CREATE TABLE "discount_redemptions" (
    "id"            TEXT NOT NULL,
    "discountId"    TEXT NOT NULL,
    "orderId"       INTEGER NOT NULL,
    "userId"        TEXT,
    "customerEmail" TEXT NOT NULL,
    "amount"        DECIMAL(12,2) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- ── indexes and keys ──────────────────────────────────────────
CREATE INDEX "discounts_mode_idx" ON "discounts"("mode");
CREATE INDEX "discounts_isActive_startsAt_endsAt_idx" ON "discounts"("isActive","startsAt","endsAt");
CREATE INDEX "discount_products_productId_idx" ON "discount_products"("productId");
CREATE INDEX "discount_categories_categoryId_idx" ON "discount_categories"("categoryId");
CREATE UNIQUE INDEX "discount_redemptions_discountId_orderId_key" ON "discount_redemptions"("discountId","orderId");
CREATE INDEX "discount_redemptions_discountId_userId_idx" ON "discount_redemptions"("discountId","userId");
CREATE INDEX "discount_redemptions_discountId_customerEmail_idx" ON "discount_redemptions"("discountId","customerEmail");
CREATE INDEX "discount_redemptions_orderId_idx" ON "discount_redemptions"("orderId");

ALTER TABLE "discount_products"
  ADD CONSTRAINT "discount_products_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discount_products_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "products"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_categories"
  ADD CONSTRAINT "discount_categories_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discount_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_redemptions"
  ADD CONSTRAINT "discount_redemptions_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discount_redemptions_orderId_fkey"    FOREIGN KEY ("orderId")    REFERENCES "orders"("id")    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discount_redemptions_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE SET NULL ON UPDATE CASCADE;

-- ── invariants ────────────────────────────────────────────────
-- The service enforces these too, but a promotion that can be wrong in the
-- database is a promotion that will eventually be wrong on an invoice.
ALTER TABLE "discounts"
  -- A coupon without a code cannot be typed in; an automatic one with a
  -- code invites someone to try to type it.
  ADD CONSTRAINT "discounts_code_matches_mode"
    CHECK (("mode" = 'COUPON' AND "code" IS NOT NULL) OR ("mode" = 'AUTOMATIC' AND "code" IS NULL)),
  -- Exactly the column that matches the type, and nothing else.
  ADD CONSTRAINT "discounts_value_matches_type"
    CHECK (("type" = 'PERCENTAGE' AND "rate" IS NOT NULL AND "amount" IS NULL)
        OR ("type" = 'FIXED'      AND "amount" IS NOT NULL AND "rate" IS NULL)),
  ADD CONSTRAINT "discounts_rate_is_a_rate" CHECK ("rate" IS NULL OR ("rate" > 0 AND "rate" <= 1)),
  ADD CONSTRAINT "discounts_amount_positive" CHECK ("amount" IS NULL OR "amount" > 0),
  ADD CONSTRAINT "discounts_usage_not_negative" CHECK ("usageCount" >= 0),
  ADD CONSTRAINT "discounts_limits_positive"
    CHECK (("usageLimit" IS NULL OR "usageLimit" > 0) AND ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0)),
  ADD CONSTRAINT "discounts_window_ordered" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt"),
  ADD CONSTRAINT "discounts_min_order_positive" CHECK ("minOrderValue" IS NULL OR "minOrderValue" > 0);

ALTER TABLE "discount_redemptions"
  ADD CONSTRAINT "discount_redemptions_amount_positive" CHECK ("amount" > 0);
