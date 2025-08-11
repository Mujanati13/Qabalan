-- Migration: Add price_override to branch_inventory table
-- This allows setting different prices per branch for products

ALTER TABLE branch_inventory 
ADD COLUMN price_override DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Override price for this product in this branch' 
AFTER min_stock_level;

-- Add index for price override queries
ALTER TABLE branch_inventory 
ADD INDEX idx_branch_inventory_price_override (price_override);
