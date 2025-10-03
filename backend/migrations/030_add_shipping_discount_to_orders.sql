ALTER TABLE orders
  ADD COLUMN delivery_fee_original DECIMAL(10,2) NULL DEFAULT NULL AFTER delivery_fee,
  ADD COLUMN shipping_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_amount;

-- Backfill existing rows with current delivery fee as the original amount
UPDATE orders
SET delivery_fee_original = delivery_fee
WHERE delivery_fee_original IS NULL;
