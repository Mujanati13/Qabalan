-- Migration 006: Add guest support to orders table
-- This migration adds support for guest orders

-- Add guest-related columns to orders table
ALTER TABLE orders 
ADD COLUMN guest_delivery_address TEXT DEFAULT NULL,
ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;

-- Update user_id to allow NULL for guest orders
ALTER TABLE orders 
MODIFY COLUMN user_id INT(11) DEFAULT NULL;

-- Update order_status_history to allow NULL for changed_by (for guest orders)
ALTER TABLE order_status_history 
MODIFY COLUMN changed_by INT(11) DEFAULT NULL;

-- Update promo_code_usages to allow NULL for user_id (for guest orders)
ALTER TABLE promo_code_usages 
MODIFY COLUMN user_id INT(11) DEFAULT NULL;

-- Create index for guest orders
CREATE INDEX idx_orders_is_guest ON orders(is_guest);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
