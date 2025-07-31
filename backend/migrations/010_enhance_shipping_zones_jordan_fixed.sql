-- Migration 010: Enhanced Shipping Zones for Jordan (FIXED)
-- This migration creates a flexible distance-based shipping zone system

-- 1. Create shipping zones table for distance-based pricing
CREATE TABLE IF NOT EXISTS `shipping_zones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_ar` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_en` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `min_distance_km` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `max_distance_km` DECIMAL(8,2) NOT NULL,
  `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `price_per_km` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `free_shipping_threshold` DECIMAL(10,2) NULL COMMENT 'Order amount for free shipping in this zone',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_shipping_zones_distance` (`min_distance_km`, `max_distance_km`),
  INDEX `idx_shipping_zones_active` (`is_active`),
  INDEX `idx_shipping_zones_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create branch-specific zone overrides
CREATE TABLE IF NOT EXISTS `branch_shipping_zones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `zone_id` INT NOT NULL,
  `custom_base_price` DECIMAL(10,2) NULL COMMENT 'Override base price for this branch',
  `custom_price_per_km` DECIMAL(10,2) NULL COMMENT 'Override per-km price for this branch',
  `custom_free_threshold` DECIMAL(10,2) NULL COMMENT 'Override free shipping threshold',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_branch_zone` (`branch_id`, `zone_id`),
  KEY `fk_branch_shipping_branch` (`branch_id`),
  KEY `fk_branch_shipping_zone` (`zone_id`),
  CONSTRAINT `fk_branch_shipping_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_branch_shipping_zone` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add columns to existing areas table for distance calculation (without creating indexes first)
ALTER TABLE `areas` 
ADD COLUMN `latitude` DECIMAL(10, 8) NULL AFTER `delivery_fee`,
ADD COLUMN `longitude` DECIMAL(11, 8) NULL AFTER `latitude`,
ADD COLUMN `zone_id` INT NULL AFTER `longitude`;

-- 4. Update user_addresses table to include shipping zone reference
ALTER TABLE `user_addresses`
ADD COLUMN `calculated_distance_km` DECIMAL(8,2) NULL COMMENT 'Distance from nearest branch in km' AFTER `longitude`,
ADD COLUMN `shipping_zone_id` INT NULL COMMENT 'Assigned shipping zone' AFTER `calculated_distance_km`;

-- 5. Create shipping cost calculation log
CREATE TABLE IF NOT EXISTS `shipping_calculations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NULL,
  `branch_id` INT NOT NULL,
  `customer_latitude` DECIMAL(10, 8) NOT NULL,
  `customer_longitude` DECIMAL(11, 8) NOT NULL,
  `calculated_distance_km` DECIMAL(8,2) NOT NULL,
  `zone_id` INT NOT NULL,
  `base_cost` DECIMAL(10,2) NOT NULL,
  `distance_cost` DECIMAL(10,2) NOT NULL,
  `total_shipping_cost` DECIMAL(10,2) NOT NULL,
  `order_amount` DECIMAL(10,2) NULL,
  `free_shipping_applied` TINYINT(1) NOT NULL DEFAULT 0,
  `calculation_method` ENUM('zone_based', 'area_based', 'default') NOT NULL DEFAULT 'zone_based',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_shipping_calc_order` (`order_id`),
  KEY `fk_shipping_calc_branch` (`branch_id`),
  KEY `fk_shipping_calc_zone` (`zone_id`),
  INDEX `idx_shipping_calc_date` (`created_at`),
  CONSTRAINT `fk_shipping_calc_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_shipping_calc_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipping_calc_zone` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Insert default Jordan shipping zones
INSERT INTO `shipping_zones` (
  `name_ar`, `name_en`, `description_ar`, `description_en`,
  `min_distance_km`, `max_distance_km`, `base_price`, `price_per_km`,
  `free_shipping_threshold`, `sort_order`
) VALUES
-- Zone 1: Within city (0-5km)
('داخل المدينة', 'Within City', 'التوصيل داخل المدينة - سريع ومضمون', 'Fast delivery within city limits', 
 0.00, 5.00, 2.00, 0.50, 50.00, 1),

-- Zone 2: City outskirts (5-15km)
('ضواحي المدينة', 'City Outskirts', 'التوصيل إلى ضواحي المدينة', 'Delivery to city outskirts and nearby areas', 
 5.01, 15.00, 3.50, 0.75, 75.00, 2),

-- Zone 3: Regional (15-30km)
('المنطقة المحيطة', 'Regional Area', 'التوصيل للمناطق المحيطة', 'Delivery to surrounding regional areas', 
 15.01, 30.00, 5.00, 1.00, 100.00, 3),

-- Zone 4: Extended (30-50km)
('المناطق البعيدة', 'Extended Area', 'التوصيل للمناطق البعيدة', 'Delivery to extended remote areas', 
 30.01, 50.00, 8.00, 1.25, 150.00, 4),

-- Zone 5: Remote (50+km)
('المناطق النائية', 'Remote Areas', 'التوصيل للمناطق النائية - يتطلب وقت إضافي', 'Remote delivery - requires additional time', 
 50.01, 999.99, 12.00, 1.50, 200.00, 5);
