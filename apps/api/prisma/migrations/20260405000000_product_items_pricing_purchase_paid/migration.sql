-- CreateEnum
CREATE TYPE "ProductItemType" AS ENUM ('QUANTITY', 'BOOLEAN');

-- AlterEnum: PurchaseStatus — replace old values with new ones
-- First rename the old type, create new, migrate data, drop old
ALTER TYPE "PurchaseStatus" ADD VALUE IF NOT EXISTS 'PAID';

-- AlterTable: Purchase — add paid, paidAt columns and change default status
ALTER TABLE "purchases"
  ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

-- CreateTable: product_items
CREATE TABLE IF NOT EXISTS "product_items" (
  "id"         TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "cost"       DECIMAL(12,2) NOT NULL,
  "type"       "ProductItemType" NOT NULL DEFAULT 'QUANTITY',
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: pricing_rules
CREATE TABLE IF NOT EXISTS "pricing_rules" (
  "id"                TEXT NOT NULL,
  "product_id"        TEXT NOT NULL,
  "min_qty"           INTEGER NOT NULL,
  "max_qty"           INTEGER,
  "margin_percentage" DECIMAL(8,2) NOT NULL,
  CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: product_items → products
ALTER TABLE "product_items"
  ADD CONSTRAINT "product_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: pricing_rules → products
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
