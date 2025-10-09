-- Migration: Allow product deletion while preserving order history
-- This modifies the foreign key constraint to SET NULL instead of preventing deletion

-- Step 1: Drop existing foreign key constraint
ALTER TABLE order_items 
DROP FOREIGN KEY fk_order_items_product;

-- Step 2: Ensure product_id column allows NULL
ALTER TABLE order_items 
MODIFY COLUMN product_id INT NULL;

-- Step 3: Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE SET NULL;

-- Optional: Add index on product_id if not exists (for performance)
-- ALTER TABLE order_items ADD INDEX idx_order_items_product_id (product_id);
