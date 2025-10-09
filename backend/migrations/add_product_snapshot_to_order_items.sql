-- Migration: Add product snapshot fields to order_items for deleted products
-- This preserves product information in order history even after product deletion

-- Add columns to store product information snapshot
ALTER TABLE order_items 
ADD COLUMN product_name_en VARCHAR(255) NULL AFTER product_id,
ADD COLUMN product_name_ar VARCHAR(255) NULL AFTER product_name_en,
ADD COLUMN product_sku VARCHAR(100) NULL AFTER product_name_ar;

-- Update existing order_items with current product information
UPDATE order_items oi
INNER JOIN products p ON oi.product_id = p.id
SET 
  oi.product_name_en = p.title_en,
  oi.product_name_ar = p.title_ar,
  oi.product_sku = p.sku;
