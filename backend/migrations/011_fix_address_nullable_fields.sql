-- Fix address creation issue: Allow street_id to be nullable
-- This migration makes address fields more flexible for better user experience

USE `fecs_db`;

-- Make location fields nullable in user_addresses table
ALTER TABLE `user_addresses` 
MODIFY COLUMN `city_id` int NULL,
MODIFY COLUMN `area_id` int NULL,
MODIFY COLUMN `street_id` int NULL;

-- Add some helpful indexes for performance
CREATE INDEX IF NOT EXISTS `idx_addresses_city` ON `user_addresses` (`city_id`);
CREATE INDEX IF NOT EXISTS `idx_addresses_area` ON `user_addresses` (`area_id`);
CREATE INDEX IF NOT EXISTS `idx_addresses_street` ON `user_addresses` (`street_id`);
CREATE INDEX IF NOT EXISTS `idx_addresses_coordinates` ON `user_addresses` (`latitude`, `longitude`);

-- Also make sure coordinates can be null (they might already be)
ALTER TABLE `user_addresses` 
MODIFY COLUMN `latitude` decimal(10, 8) NULL,
MODIFY COLUMN `longitude` decimal(11, 8) NULL;
