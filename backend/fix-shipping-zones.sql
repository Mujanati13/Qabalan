-- Fix shipping zones to use FLAT PRICING (base price only, no per-km charges)

-- First, check current zones
SELECT * FROM shipping_zones WHERE is_active = 1 ORDER BY sort_order;

-- Update ALL zones to use flat pricing (price_per_km = 0.00)
UPDATE shipping_zones 
SET price_per_km = 0.00
WHERE is_active = 1;

-- Update Zone 1: Within City (0-5km) - Flat 2.00 JOD
UPDATE shipping_zones 
SET 
  min_distance_km = 0.00,
  max_distance_km = 5.00,
  base_price = 2.00,
  price_per_km = 0.00
WHERE name_en = 'Within City' AND is_active = 1;

-- Update Zone 2: City Outskirts (5-15km) - Flat 3.50 JOD
UPDATE shipping_zones 
SET 
  min_distance_km = 5.01,
  max_distance_km = 15.00,
  base_price = 3.50,
  price_per_km = 0.00
WHERE name_en = 'City Outskirts' AND is_active = 1;

-- Update Zone 3: Nearby Cities (15-30km) - Flat 5.00 JOD
UPDATE shipping_zones 
SET 
  min_distance_km = 15.01,
  max_distance_km = 30.00,
  base_price = 5.00,
  price_per_km = 0.00
WHERE name_en = 'Nearby Cities' AND is_active = 1;

-- Update Zone 4: Regional (30-50km) - Flat 8.00 JOD
UPDATE shipping_zones 
SET 
  min_distance_km = 30.01,
  max_distance_km = 50.00,
  base_price = 8.00,
  price_per_km = 0.00
WHERE name_en = 'Regional' AND is_active = 1;

-- Update Zone 5: Long Distance (50+km) - Flat 12.00 JOD
UPDATE shipping_zones 
SET 
  min_distance_km = 50.01,
  max_distance_km = 100.00,
  base_price = 12.00,
  price_per_km = 0.00
WHERE name_en = 'Long Distance' AND is_active = 1;

-- Verify the changes - should show 0.00 for all price_per_km
SELECT 
  id,
  name_en,
  min_distance_km,
  max_distance_km,
  base_price,
  price_per_km,
  free_shipping_threshold,
  CASE 
    WHEN price_per_km = 0.00 THEN CONCAT('Flat ', base_price, ' JOD')
    ELSE CONCAT(base_price, ' + (', price_per_km, ' × km) JOD')
  END as pricing_formula,
  sort_order
FROM shipping_zones 
WHERE is_active = 1 
ORDER BY sort_order;
