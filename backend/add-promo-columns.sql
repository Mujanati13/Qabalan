-- Add promo code columns to orders table
ALTER TABLE orders 
ADD COLUMN promo_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied promo code' AFTER discount_amount,
ADD COLUMN promo_discount_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Discount amount from promo code' AFTER promo_code;

-- Add index for faster promo code lookups
CREATE INDEX idx_promo_code ON orders(promo_code);

-- Verify the columns were added
DESCRIBE orders;
