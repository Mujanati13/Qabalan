-- Migration to create promo_codes table if it doesn't exist
-- This will ensure the table exists with the correct structure

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS `promo_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title_ar` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `title_en` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discount_type` enum('percentage','fixed_amount') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2),
  `max_discount_amount` decimal(10,2),
  `usage_limit` int,
  `usage_count` int NOT NULL DEFAULT '0',
  `user_usage_limit` int DEFAULT '1',
  `valid_from` timestamp NOT NULL,
  `valid_until` timestamp NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promo_codes_code_unique` (`code`),
  INDEX `idx_promo_codes_active` (`is_active`),
  INDEX `idx_promo_codes_valid` (`valid_from`, `valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create promo_code_usages table if it doesn't exist
CREATE TABLE IF NOT EXISTS `promo_code_usages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `promo_code_id` int NOT NULL,
  `user_id` int NOT NULL,
  `order_id` int NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_promo_usages_code` (`promo_code_id`),
  KEY `fk_promo_usages_user` (`user_id`),
  KEY `fk_promo_usages_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample promo codes for testing
INSERT IGNORE INTO `promo_codes` (
  `code`, `title_en`, `title_ar`, `description_en`, `description_ar`,
  `discount_type`, `discount_value`, `min_order_amount`, `usage_limit`, 
  `valid_from`, `valid_until`, `is_active`
) VALUES
('WELCOME10', 'Welcome 10% Off', 'خصم ترحيبي 10%', 'Get 10% off your first order', 'احصل على خصم 10% على طلبك الأول', 'percentage', 10.00, 50.00, 100, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1),
('SAVE20', 'Save $20', 'وفر 20 دولار', 'Save $20 on orders over $100', 'وفر 20 دولار على الطلبات التي تزيد عن 100 دولار', 'fixed_amount', 20.00, 100.00, 50, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 1),
('FREESHIP', 'Free Shipping', 'شحن مجاني', 'Free shipping on all orders', 'شحن مجاني على جميع الطلبات', 'fixed_amount', 5.00, 25.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), 1);
