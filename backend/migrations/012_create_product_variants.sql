-- Migration: Create product variants system
-- This migration creates the product_variants table to store different variations of products

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  variant_name VARCHAR(100) NOT NULL COMMENT 'Type of variant (Size, Color, Material, etc.)',
  variant_value VARCHAR(255) NOT NULL COMMENT 'Value of the variant (Large, Red, Cotton, etc.)',
  price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Price adjustment for this variant (+/- amount)',
  stock_quantity INT DEFAULT 0 COMMENT 'Stock quantity for this specific variant',
  sku VARCHAR(100) NULL COMMENT 'Unique SKU for this variant',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_variants_product_id (product_id),
  INDEX idx_product_variants_variant_name (variant_name),
  INDEX idx_product_variants_sku (sku),
  INDEX idx_product_variants_active (is_active),
  INDEX idx_product_variants_stock (stock_quantity),
  UNIQUE KEY unique_product_variant (product_id, variant_name, variant_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
