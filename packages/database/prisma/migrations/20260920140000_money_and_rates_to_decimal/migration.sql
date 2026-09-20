-- D3: money and rates leave floating point.
--
-- Binary floats can't represent 0.1 exactly, so totals assembled from them
-- drift; Decimal(12,2) stores the amount people actually agreed on.
-- Scales: money 12,2 (up to 9,999,999,999.99); rates 5,4 (0.1300 = 13%);
-- exchange rates 18,8.
--
-- Pre-checked on this database before writing: of every value in these 22
-- columns, none needs more than the target scale, so each cast is exact.
-- discounts.value stays money-scaled: it holds either an amount or a whole
-- percentage, both of which fit 12,2.

-- AlterTable
ALTER TABLE "configurations" ALTER COLUMN "configPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "priceIncrease" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "shippingPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(5,4),
ALTER COLUMN "lampPriceIncrease" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "currency_rates" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "discounts" ALTER COLUMN "value" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "configPrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "productPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountedPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountRate" SET DATA TYPE DECIMAL(5,4),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "configPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "priceIncrease" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "shippingPrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "price_history" ALTER COLUMN "oldPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "newPrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "priceOverride" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "priceIncrease" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(5,4);

