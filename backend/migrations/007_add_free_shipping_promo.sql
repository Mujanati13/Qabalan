-- Migration 007: Add Free Shipping promo functionality
-- This adds support for free shipping discount type with configurable conditions

-- 1. Update promo_codes table to include free_shipping discount type
ALTER TABLE `promo_codes` 
MODIFY COLUMN `discount_type` ENUM('percentage', 'fixed_amount', 'free_shipping') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- 2. Create table for free shipping conditions
CREATE TABLE IF NOT EXISTS `promo_shipping_conditions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `promo_code_id` INT NOT NULL,
  `condition_type` ENUM('min_order_amount', 'min_quantity', 'specific_category', 'specific_product', 'user_type', 'location') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_operator` ENUM('>=', '<=', '=', '!=', 'in', 'not_in') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '>=',
  `condition_value` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_value_numeric` DECIMAL(10,2) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_shipping_conditions_promo` (`promo_code_id`),
  KEY `idx_condition_type` (`condition_type`),
  KEY `idx_condition_active` (`is_active`),
  CONSTRAINT `fk_shipping_conditions_promo` 
    FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create table to define condition groups and logic operators
CREATE TABLE IF NOT EXISTS `promo_condition_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `promo_code_id` INT NOT NULL,
  `group_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Group 1',
  `logic_operator` ENUM('AND', 'OR') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AND',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_condition_groups_promo` (`promo_code_id`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `fk_condition_groups_promo` 
    FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add group_id to shipping conditions to link them to condition groups
ALTER TABLE `promo_shipping_conditions` 
ADD COLUMN `group_id` INT NULL AFTER `promo_code_id`,
ADD KEY `fk_shipping_conditions_group` (`group_id`),
ADD CONSTRAINT `fk_shipping_conditions_group` 
  FOREIGN KEY (`group_id`) REFERENCES `promo_condition_groups` (`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add some sample free shipping promo codes for testing
INSERT IGNORE INTO `promo_codes` (
  `code`, `title_en`, `title_ar`, `description_en`, `description_ar`,
  `discount_type`, `discount_value`, `min_order_amount`, `usage_limit`, 
  `valid_from`, `valid_until`, `is_active`
) VALUES
(
  'FREESHIP50', 
  'Free Shipping on Orders $50+', 
  'شحن مجاني للطلبات +50$', 
  'Get free shipping on orders over $50', 
  'احصل على شحن مجاني للطلبات أكثر من 50$', 
  'free_shipping', 
  0.00, 
  50.00, 
  NULL, 
  NOW(), 
  DATE_ADD(NOW(), INTERVAL 90 DAY), 
  1
);

-- 6. Add sample condition group for the free shipping promo
SET @promo_id = LAST_INSERT_ID();
INSERT INTO `promo_condition_groups` (`promo_code_id`, `group_name`, `logic_operator`) 
VALUES (@promo_id, 'Order Requirements', 'AND');

-- 7. Add sample conditions for the free shipping promo
SET @group_id = LAST_INSERT_ID();
INSERT INTO `promo_shipping_conditions` 
  (`promo_code_id`, `group_id`, `condition_type`, `condition_operator`, `condition_value`, `condition_value_numeric`) 
VALUES 
  (@promo_id, @group_id, 'min_order_amount', '>=', '50.00', 50.00);

-- 8. Create indexes for better performance
CREATE INDEX `idx_promo_codes_discount_type` ON `promo_codes` (`discount_type`);
CREATE INDEX `idx_shipping_conditions_numeric` ON `promo_shipping_conditions` (`condition_value_numeric`);
