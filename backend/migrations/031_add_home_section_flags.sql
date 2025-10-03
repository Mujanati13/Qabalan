-- Migration: Add home section flags to products table
-- Run this migration to allow admins to curate homepage sections

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_home_top TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN IF NOT EXISTS is_home_new TINYINT(1) NOT NULL DEFAULT 0 AFTER is_home_top;
