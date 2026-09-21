-- Orders get lines.
--
-- An order held exactly one product, in columns on the order itself, so a
-- customer with three products in the cart placed three orders, paid
-- shipping three times, and the admin saw three unrelated rows. From here
-- the order is a header and its products are rows in order_items.
--
-- Additive only: the single-product columns on orders become optional
-- rather than being dropped, and every existing order is copied into
-- order_items as one line below, so anything reading lines sees the whole
-- history. The old columns can go in a later migration once nothing reads
-- them.


-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "bulbId" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "productColorTemp" TEXT,
ADD COLUMN     "productImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "productIp" TEXT,
ADD COLUMN     "productName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "productName" DROP NOT NULL,
ALTER COLUMN "productColorTemp" DROP NOT NULL,
ALTER COLUMN "productIp" DROP NOT NULL,
ALTER COLUMN "productChandLamp" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "productPrice" DROP NOT NULL,
ALTER COLUMN "configPrice" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bulbId_fkey" FOREIGN KEY ("bulbId") REFERENCES "bulbs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A line is at least one unit, and neither its discount nor its total can
-- be negative. Checked by the database, not only by the code that writes.
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_amounts_non_negative" CHECK ("discountAmount" >= 0 AND "lineTotal" >= 0);

-- Every existing order, as one line.
--
-- totalPrice has always been what the customer paid including shipping,
-- so the line came to totalPrice − shippingPrice. The unit is the product
-- price plus its recorded upgrade; where that falls short of the line (a
-- bulb upgrade before it was stored), the unit is taken from the line
-- instead, rounded up so unit × quantity never undercounts it. Whatever the
-- unit × quantity exceeds the line by is the discount, and lineTotal is
-- computed from those two so the line's own arithmetic always holds.
--
-- The id is derived from the order's, and a line is only written for an
-- order that has none, so this cannot duplicate anything.
INSERT INTO "order_items" (
  "id", "orderId", "productId", "quantity", "configPrice", "configurationId",
  "productName", "productImages", "brand", "productIp", "productColorTemp", "bulbId",
  "discountAmount", "lineTotal"
)
SELECT
  'legacy_' || o."id",
  o."id",
  o."productId",
  q.qty,
  u.unit,
  o."configurationId",
  COALESCE(o."productName", ''),
  COALESCE(o."productImages", ARRAY[]::TEXT[]),
  o."brand",
  o."productIp",
  o."productColorTemp",
  o."bulbId",
  GREATEST(u.unit * q.qty - l.paid, 0),
  u.unit * q.qty - GREATEST(u.unit * q.qty - l.paid, 0)
FROM "orders" o
CROSS JOIN LATERAL (SELECT GREATEST(COALESCE(o."quantity", 1), 1) AS qty) q
CROSS JOIN LATERAL (SELECT GREATEST(o."totalPrice" - o."shippingPrice", 0) AS paid) l
CROSS JOIN LATERAL (
  SELECT GREATEST(
    COALESCE(o."productPrice", 0) + COALESCE(o."priceIncrease", 0),
    CEIL(l.paid / q.qty * 100) / 100
  )::DECIMAL(12, 2) AS unit
) u
WHERE o."productId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "order_items" i WHERE i."orderId" = o."id");

-- The header totals, from the lines just written.
UPDATE "orders" o
SET "subtotal" = s.subtotal,
    "discountTotal" = s.discount_total
FROM (
  SELECT "orderId", SUM("configPrice" * "quantity") AS subtotal, SUM("discountAmount") AS discount_total
  FROM "order_items"
  GROUP BY "orderId"
) s
WHERE s."orderId" = o."id"
  AND o."subtotal" = 0
  AND o."discountTotal" = 0;
