-- Quotations (customers, quotations, lines, numbering) and ProductImage.role.
-- Additive only: no existing row is changed. A null image role keeps the
-- catalog's old convention (first image = photo, the rest = drawings).

-- CreateEnum
CREATE TYPE "ProductImageRole" AS ENUM ('PHOTO', 'DRAWING', 'APPLICATION');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "role" "ProductImageRole";

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subject" TEXT,
    "discountType" "DiscountType",
    "discountRate" DECIMAL(5,4),
    "discountAmount" DECIMAL(12,2),
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "customerSnapshot" JSONB NOT NULL,
    "revisionOfId" TEXT,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_lines" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sku" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "quotation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next" INTEGER NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("type")
);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_companyName_idx" ON "customers"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_number_key" ON "quotations"("number");

-- CreateIndex
CREATE INDEX "quotations_customerId_idx" ON "quotations"("customerId");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_createdAt_idx" ON "quotations"("createdAt");

-- CreateIndex
CREATE INDEX "quotation_lines_quotationId_position_idx" ON "quotation_lines"("quotationId", "position");

-- CreateIndex
CREATE INDEX "quotation_lines_productId_idx" ON "quotation_lines"("productId");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The whole-quotation discount: none, or exactly the one field its type uses.
-- The same one-column-one-meaning rule as "discounts" (20260921000000).
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_discount_shape_check" CHECK (
  ("discountType" IS NULL AND "discountRate" IS NULL AND "discountAmount" IS NULL)
  OR ("discountType" = 'PERCENTAGE' AND "discountRate" IS NOT NULL AND "discountAmount" IS NULL)
  OR ("discountType" = 'FIXED' AND "discountAmount" IS NOT NULL AND "discountRate" IS NULL)
);
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rates_check" CHECK (
  "taxRate" >= 0 AND "taxRate" <= 1
  AND ("discountRate" IS NULL OR ("discountRate" >= 0 AND "discountRate" <= 1))
  AND ("discountAmount" IS NULL OR "discountAmount" >= 0)
);
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_values_check" CHECK (
  "quantity" > 0 AND "unitPrice" >= 0 AND "discountRate" >= 0 AND "discountRate" <= 1
);
