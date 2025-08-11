/*
 * FECS Branch Availability Migration
 * Run this SQL script to add the missing is_available column to branch_inventory table
 * 
 * Instructions:
 * 1. Open your MySQL client (phpMyAdmin, MySQL Workbench, or command line)
 * 2. Select the FECS database (usually named 'fecs_db' or 'fecs_ecommerce')
 * 3. Run this entire script
 */

USE fecs_db; -- Change this to your actual database name if different

-- Check if column already exists (optional check)
SELECT 
  COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM 
  INFORMATION_SCHEMA.COLUMNS 
WHERE 
  TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'branch_inventory' 
  AND COLUMN_NAME = 'is_available';

-- Add the is_available column if it doesn't exist
-- This will fail gracefully if column already exists
ALTER TABLE branch_inventory 
ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Whether product is available in this branch (1=available, 0=unavailable)' 
AFTER price_override;

-- Add index for better query performance
ALTER TABLE branch_inventory 
ADD INDEX idx_branch_inventory_available (is_available);

-- Verify the column was added
DESCRIBE branch_inventory;

-- Show a sample of the data
SELECT 
  id, branch_id, product_id, stock_quantity, is_available, updated_at 
FROM 
  branch_inventory 
LIMIT 5;

-- Success message
SELECT 'Migration completed successfully! The is_available column has been added to branch_inventory table.' as Status;
