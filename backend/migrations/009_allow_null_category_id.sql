-- Allow products to exist without a category
-- This enables removing products from all categories

ALTER TABLE products 
MODIFY COLUMN category_id INT NULL;

-- Update the foreign key constraint to handle null values properly
-- First, let's check if there's an existing foreign key constraint
-- and recreate it to allow null values

-- Note: The foreign key constraint should already allow NULL values
-- This migration primarily changes the column definition
