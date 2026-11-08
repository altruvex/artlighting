-- Products built to the customer's specification and priced on request:
-- the storefront hides their price and replaces the buy buttons with a
-- "contact us" dialog. Additive with a default, so code deployed before it
-- keeps working.
ALTER TABLE "products" ADD COLUMN "madeToOrder" BOOLEAN NOT NULL DEFAULT false;
