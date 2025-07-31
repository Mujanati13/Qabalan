-- Migration: 011_create_offers_system.sql
-- Description: Create offers system tables for customer-facing promotions

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  offer_type ENUM('seasonal', 'flash', 'bxgy', 'bundle', 'loyalty') NOT NULL DEFAULT 'seasonal',
  discount_type ENUM('percentage', 'fixed', 'bxgy') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2) DEFAULT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  featured_image VARCHAR(500) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_offer_active (is_active),
  INDEX idx_offer_dates (valid_from, valid_until),
  INDEX idx_offer_type (offer_type),
  INDEX idx_offer_created (created_at)
);

-- Create offer_products junction table
CREATE TABLE IF NOT EXISTS offer_products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  offer_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_offer_product (offer_id, product_id),
  INDEX idx_offer_product_offer (offer_id),
  INDEX idx_offer_product_product (product_id)
);

-- Create offer_features table
CREATE TABLE IF NOT EXISTS offer_features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  offer_id INT NOT NULL,
  feature_text VARCHAR(300) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_offer_features_offer (offer_id),
  INDEX idx_offer_features_sort (offer_id, sort_order)
);

-- Create offer_terms table
CREATE TABLE IF NOT EXISTS offer_terms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  offer_id INT NOT NULL,
  term_text VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_offer_terms_offer (offer_id),
  INDEX idx_offer_terms_sort (offer_id, sort_order)
);

-- Insert sample offers
INSERT INTO offers (
  title, description, offer_type, discount_type, discount_value,
  min_order_amount, max_discount_amount, valid_from, valid_until,
  featured_image, is_active
) VALUES 
(
  'Summer Sale 2025',
  'Get 50% off on all summer items. Limited time offer with premium pastries and cakes.',
  'seasonal',
  'percentage',
  50.00,
  100.00,
  200.00,
  '2025-07-01 00:00:00',
  '2025-08-31 23:59:59',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
  TRUE
),
(
  'Buy 2 Get 1 Free',
  'Special offer on selected bakery items. Perfect for families and parties.',
  'bxgy',
  'bxgy',
  0.00,
  0.00,
  NULL,
  '2025-07-15 00:00:00',
  '2025-07-30 23:59:59',
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80',
  TRUE
),
(
  'Flash Sale: Weekend Special',
  'Limited time flash sale with incredible discounts on premium desserts.',
  'flash',
  'percentage',
  40.00,
  50.00,
  150.00,
  '2025-07-26 00:00:00',
  '2025-07-28 23:59:59',
  'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=800&q=80',
  TRUE
);

-- Insert sample offer features
INSERT INTO offer_features (offer_id, feature_text, sort_order) VALUES
(1, 'Premium quality ingredients sourced locally', 1),
(1, 'Handcrafted by expert bakers with 15+ years experience', 2),
(1, 'Fresh daily preparation - baked every morning', 3),
(1, 'Free delivery on orders over $50 within city limits', 4),
(2, 'Perfect for sharing with family and friends', 1),
(2, 'Mix and match different varieties', 2),
(2, 'No minimum order required', 3),
(2, 'Valid on weekends only', 4),
(3, 'Limited quantity available', 1),
(3, 'First come, first served basis', 2),
(3, 'Premium packaging included', 3),
(3, 'Same-day delivery available', 4);

-- Insert sample offer terms
INSERT INTO offer_terms (offer_id, term_text, sort_order) VALUES
(1, 'Offer valid for limited time only until stock lasts', 1),
(1, 'Cannot be combined with other promotional offers', 2),
(1, 'Subject to availability of items', 3),
(1, 'Free delivery within 10km radius of our branches', 4),
(1, 'Minimum order amount excludes delivery charges', 5),
(2, 'Buy 2 items from eligible categories get 1 free', 1),
(2, 'Free item will be of equal or lesser value', 2),
(2, 'Valid on selected bakery items only', 3),
(2, 'Cannot be combined with other offers', 4),
(2, 'One offer per customer per day', 5),
(3, 'Flash sale valid for 48 hours only', 1),
(3, 'While supplies last - limited stock available', 2),
(3, 'Online orders only during flash sale period', 3),
(3, 'Payment must be completed within sale period', 4),
(3, 'No rain checks or extensions available', 5);

-- Link offers to products (assuming some products exist)
-- Note: Update product IDs based on actual products in your database
INSERT INTO offer_products (offer_id, product_id) 
SELECT 1, p.id FROM products p WHERE p.category_id IN (1, 2, 3) AND p.is_active = 1 LIMIT 5;

INSERT INTO offer_products (offer_id, product_id) 
SELECT 2, p.id FROM products p WHERE p.category_id = 2 AND p.is_active = 1 LIMIT 3;

INSERT INTO offer_products (offer_id, product_id) 
SELECT 3, p.id FROM products p WHERE p.price > 20 AND p.is_active = 1 LIMIT 4;

-- Add migration tracking
INSERT INTO schema_migrations (version, description, executed_at) 
VALUES ('011', 'Create offers system tables', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();
