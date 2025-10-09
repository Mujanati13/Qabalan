-- Migration: Add bilingual title support to product variants
-- This migration adds title_ar and title_en columns to enable Arabic and English variant names

ALTER TABLE product_variants
  ADD COLUMN title_en VARCHAR(255) NULL AFTER variant_value,
  ADD COLUMN title_ar VARCHAR(255) NULL AFTER title_en;

-- Update existing variants to populate bilingual titles from variant_value as fallback
UPDATE product_variants 
SET 
  title_en = variant_value,
  title_ar = variant_value
WHERE title_en IS NULL OR title_ar IS NULL;

-- Add indexes for better search performance
CREATE INDEX idx_product_variants_title_en ON product_variants(title_en);
CREATE INDEX idx_product_variants_title_ar ON product_variants(title_ar);
