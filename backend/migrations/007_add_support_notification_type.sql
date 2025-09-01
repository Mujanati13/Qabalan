-- Add support types to notifications table
-- Migration: 007_add_support_notification_type.sql

-- Step 1: Add support to the enum
ALTER TABLE `notifications` 
MODIFY COLUMN `type` enum('general','order','promotion','system','support','support_reply') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general';

-- Step 2: Update existing support_reply records to use support (optional)
-- UPDATE `notifications` SET `type` = 'support' WHERE `type` = 'support_reply';
