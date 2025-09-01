-- Migration: Add phone support to verification_codes table
-- This enables SMS verification without requiring existing user account

-- Modify verification_codes table to support phone verification
ALTER TABLE `verification_codes` 
ADD COLUMN `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `user_id`,
MODIFY COLUMN `user_id` int NULL,
MODIFY COLUMN `type` enum('email_verification','phone_verification','password_reset','sms_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Add index for phone lookups
ALTER TABLE `verification_codes` 
ADD INDEX `idx_verification_codes_phone` (`phone`);

-- Add constraint to ensure either user_id or phone is provided
ALTER TABLE `verification_codes` 
ADD CONSTRAINT `chk_verification_codes_user_or_phone` 
CHECK ((`user_id` IS NOT NULL) OR (`phone` IS NOT NULL));

-- Add unique constraint for phone + type + active verification
-- This prevents multiple active verification codes for the same phone
ALTER TABLE `verification_codes` 
ADD INDEX `idx_verification_codes_phone_type_active` (`phone`, `type`, `used_at`);
