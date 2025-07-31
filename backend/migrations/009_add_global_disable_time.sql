-- Migration 009: Add System Settings for Global Disable Time
-- This migration adds system-wide settings including global disable time functionality

-- 1. Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `setting_value` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `setting_type` ENUM('string', 'number', 'boolean', 'time', 'json') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `description_en` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_ar` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_configurable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this setting can be changed by admins',
  `requires_restart` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether changing this setting requires system restart',
  `category` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting_key` (`setting_key`),
  KEY `idx_category` (`category`),
  KEY `idx_configurable` (`is_configurable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert default system settings for global disable time
INSERT IGNORE INTO `system_settings` 
  (`setting_key`, `setting_value`, `setting_type`, `description_en`, `description_ar`, `category`, `sort_order`) 
VALUES
  (
    'global_disable_time_enabled', 
    'false', 
    'boolean', 
    'Enable global disable time for all products and categories',
    'تفعيل وقت إيقاف عام لجميع المنتجات والفئات',
    'operations',
    1
  ),
  (
    'global_disable_time', 
    '00:00:00', 
    'time', 
    'Time when all products and categories will be automatically disabled (24-hour format)',
    'الوقت الذي سيتم فيه إيقاف جميع المنتجات والفئات تلقائياً (تنسيق 24 ساعة)',
    'operations',
    2
  ),
  (
    'global_disable_timezone', 
    'UTC', 
    'string', 
    'Timezone for global disable time',
    'المنطقة الزمنية لوقت الإيقاف العام',
    'operations',
    3
  ),
  (
    'global_disable_action', 
    'hide', 
    'string', 
    'Action to take when disable time is reached: hide or deactivate',
    'الإجراء المتخذ عند الوصول لوقت الإيقاف: إخفاء أو إلغاء تفعيل',
    'operations',
    4
  ),
  (
    'global_disable_message_en', 
    'Our store is currently closed. Please check back later.', 
    'string', 
    'Message to display when store is disabled (English)',
    'الرسالة التي تظهر عند إغلاق المتجر (بالإنجليزية)',
    'operations',
    5
  ),
  (
    'global_disable_message_ar', 
    'متجرنا مغلق حالياً. يرجى العودة لاحقاً.', 
    'string', 
    'Message to display when store is disabled (Arabic)',
    'الرسالة التي تظهر عند إغلاق المتجر (بالعربية)',
    'operations',
    6
  ),
  (
    'global_enable_time', 
    '06:00:00', 
    'time', 
    'Time when all products and categories will be automatically re-enabled',
    'الوقت الذي سيتم فيه إعادة تفعيل جميع المنتجات والفئات تلقائياً',
    'operations',
    7
  ),
  (
    'auto_enable_on_restart', 
    'true', 
    'boolean', 
    'Automatically enable all products when system starts',
    'تفعيل جميع المنتجات تلقائياً عند بدء تشغيل النظام',
    'operations',
    8
  );

-- 3. Add a status tracking table for disable time logs
CREATE TABLE IF NOT EXISTS `global_disable_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `action` ENUM('disabled', 'enabled', 'manual_override') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` ENUM('scheduled', 'manual', 'system_start') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `affected_products` INT DEFAULT 0,
  `affected_categories` INT DEFAULT 0,
  `disable_time` TIME NULL,
  `admin_user_id` INT NULL,
  `notes` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_action` (`action`),
  KEY `idx_trigger_type` (`trigger_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create indexes for better performance
CREATE INDEX `idx_system_settings_category_order` ON `system_settings` (`category`, `sort_order`);

-- 5. Add a column to track original state before global disable (if not exists)
ALTER TABLE `products` 
ADD COLUMN IF NOT EXISTS `original_is_active` TINYINT(1) NULL 
COMMENT 'Original active state before global disable';

ALTER TABLE `categories` 
ADD COLUMN IF NOT EXISTS `original_is_active` TINYINT(1) NULL 
COMMENT 'Original active state before global disable';
