-- Migrate purchases with legacy status 'RECEIVED' to 'PAID'
-- The PurchaseStatus enum was changed from (PENDING, RECEIVED, CANCELLED)
-- to (PENDING, PAID, CANCELLED). All RECEIVED purchases were already paid.
UPDATE "purchases" SET "status" = 'PAID' WHERE "status" = 'RECEIVED';
