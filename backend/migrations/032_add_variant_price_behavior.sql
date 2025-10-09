-- Migration: Add price behavior controls to product variants
-- Adds support for distinguishing override vs additive pricing and defining override priority

ALTER TABLE product_variants
  ADD COLUMN price_behavior ENUM('add', 'override') NOT NULL DEFAULT 'add' AFTER price_modifier,
  ADD COLUMN override_priority INT NULL DEFAULT NULL AFTER price_behavior;
