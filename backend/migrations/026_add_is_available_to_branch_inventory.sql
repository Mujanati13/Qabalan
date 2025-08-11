-- Migration: Add is_available column to branch_inventory table
-- This allows enabling/disabling products in specific branches

-- Add the is_available column
ALTER TABLE branch_inventory 
ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Whether product is available in this branch (1=available, 0=unavailable)' 
AFTER price_override;

-- Add index for better query performance
ALTER TABLE branch_inventory 
ADD INDEX idx_branch_inventory_available (is_available);

-- Update any existing records to be available by default
UPDATE branch_inventory SET is_available = 1 WHERE is_available IS NULL;
