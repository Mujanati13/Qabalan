-- Add auto_apply_eligible column to promo_codes table
ALTER TABLE promo_codes 
ADD COLUMN auto_apply_eligible TINYINT(1) DEFAULT 0 COMMENT 'Whether this promo code can be automatically applied/detected in mobile app';

-- Update existing promo codes to be auto-apply eligible by default (you can adjust this as needed)
UPDATE promo_codes SET auto_apply_eligible = 1 WHERE is_active = 1;