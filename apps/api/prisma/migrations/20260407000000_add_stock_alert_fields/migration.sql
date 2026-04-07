-- AlterTable: add stock alert tracking fields to products
ALTER TABLE "products" ADD COLUMN "alert_sent" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "products" ADD COLUMN "alert_sent_at" TIMESTAMP(3);
