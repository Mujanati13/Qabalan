ALTER TABLE `user_addresses` ADD COLUMN `phone` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `name`;

ALTER TABLE `user_addresses` ADD INDEX `idx_addresses_phone` (`phone`);
