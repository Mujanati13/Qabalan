-- =====================================================
-- Jordan Cities Database Update Script
-- This script removes all existing cities and replaces them with Jordan cities
-- =====================================================

-- WARNING: This will delete all existing cities and related data
-- Make sure to backup your database before running this script

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Remove all existing cities
DELETE FROM cities;

-- Reset auto increment
ALTER TABLE cities AUTO_INCREMENT = 1;

-- Insert Jordan cities (Governorates and major cities)
INSERT INTO cities (title_ar, title_en, is_active, created_at, updated_at) VALUES
-- Major Governorates
('عمان', 'Amman', 1, NOW(), NOW()),
('الزرقاء', 'Zarqa', 1, NOW(), NOW()),
('إربد', 'Irbid', 1, NOW(), NOW()),
('العقبة', 'Aqaba', 1, NOW(), NOW()),
('البلقاء', 'Balqa', 1, NOW(), NOW()),
('المفرق', 'Mafraq', 1, NOW(), NOW()),
('جرش', 'Jerash', 1, NOW(), NOW()),
('مادبا', 'Madaba', 1, NOW(), NOW()),
('الكرك', 'Karak', 1, NOW(), NOW()),
('الطفيلة', 'Tafilah', 1, NOW(), NOW()),
('معان', 'Ma\'an', 1, NOW(), NOW()),
('عجلون', 'Ajloun', 1, NOW(), NOW()),

-- Major cities and towns in Amman Governorate
('وادي السير', 'Wadi as-Seer', 1, NOW(), NOW()),
('الرصيفة', 'Russeifa', 1, NOW(), NOW()),
('أبو علندا', 'Abu Alanda', 1, NOW(), NOW()),
('ناعور', 'Na\'ur', 1, NOW(), NOW()),
('سحاب', 'Sahab', 1, NOW(), NOW()),
('الجويدة', 'Al Juwaydah', 1, NOW(), NOW()),
('الموقر', 'Al Muwaqqar', 1, NOW(), NOW()),
('أم الرصاص', 'Umm ar Rasas', 1, NOW(), NOW()),

-- Cities in Zarqa Governorate
('الهاشمية', 'Al Hashimiyyah', 1, NOW(), NOW()),
('الضليل', 'Ad Dulayl', 1, NOW(), NOW()),
('الأزرق', 'Al Azraq', 1, NOW(), NOW()),

-- Cities in Irbid Governorate
('الرمثا', 'Ramtha', 1, NOW(), NOW()),
('العارضة', 'Al Ardah', 1, NOW(), NOW()),
('حوارة', 'Hawara', 1, NOW(), NOW()),
('كفر أسد', 'Kafr Asad', 1, NOW(), NOW()),
('الطيبة', 'Tayyibah', 1, NOW(), NOW()),
('المزار الشمالي', 'Al Mazar ash Shamali', 1, NOW(), NOW()),
('دير أبي سعيد', 'Dayr Abi Said', 1, NOW(), NOW()),
('كفر يوبا', 'Kafr Yuba', 1, NOW(), NOW()),
('الطرة', 'At Turrah', 1, NOW(), NOW()),
('الوسطية', 'Al Wastiyyah', 1, NOW(), NOW()),
('الحصن', 'Al Husn', 1, NOW(), NOW()),
('بني كنانة', 'Bani Kinanah', 1, NOW(), NOW()),
('الأغوار الشمالية', 'Northern Jordan Valley', 1, NOW(), NOW()),

-- Cities in Balqa Governorate
('السلط', 'As-Salt', 1, NOW(), NOW()),
('فحيص', 'Fuheis', 1, NOW(), NOW()),
('عين الباشا', 'Ain al Basha', 1, NOW(), NOW()),
('الشونة الجنوبية', 'Ash Shunah al Janubiyyah', 1, NOW(), NOW()),
('الشونة الشمالية', 'Ash Shunah ash Shamaliyyah', 1, NOW(), NOW()),
('دير علا', 'Dayr Alla', 1, NOW(), NOW()),
('الأغوار الوسطى', 'Central Jordan Valley', 1, NOW(), NOW()),

-- Cities in Karak Governorate
('المزار الجنوبي', 'Al Mazar al Janubi', 1, NOW(), NOW()),
('الربة', 'Ar Rabbah', 1, NOW(), NOW()),
('عي', 'Ay', 1, NOW(), NOW()),
('القطرانة', 'Al Qatranah', 1, NOW(), NOW()),
('الأغوار الجنوبية', 'Southern Jordan Valley', 1, NOW(), NOW()),

-- Cities in Ma'an Governorate
('الشوبك', 'Ash Shawbak', 1, NOW(), NOW()),
('وادي موسى', 'Wadi Musa', 1, NOW(), NOW()),
('العيص', 'Al Ays', 1, NOW(), NOW()),

-- Cities in Mafraq Governorate
('الزعتري', 'Zaatari', 1, NOW(), NOW()),

-- Cities in Jerash Governorate
('دبين', 'Dibbin', 1, NOW(), NOW()),

-- Cities in Ajloun Governorate
('برما', 'Barma', 1, NOW(), NOW()),
('كفرنجة', 'Kufranjah', 1, NOW(), NOW());

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the insertion
SELECT COUNT(*) as total_cities FROM cities;

-- Show sample of inserted cities
SELECT id, title_ar, title_en FROM cities ORDER BY id LIMIT 15;

-- Show cities by first letter for verification
SELECT 
  SUBSTRING(title_en, 1, 1) as first_letter,
  COUNT(*) as count
FROM cities 
GROUP BY SUBSTRING(title_en, 1, 1)
ORDER BY first_letter;

-- Show governorate distribution
SELECT 
  CASE 
    WHEN title_en IN ('Amman', 'Abu Alanda', 'Na\'ur', 'Sahab', 'Al Juwaydah', 'Al Muwaqqar', 'Umm ar Rasas', 'Wadi as-Seer') THEN 'Amman Governorate'
    WHEN title_en IN ('Zarqa', 'Russeifa', 'Al Hashimiyyah', 'Ad Dulayl', 'Al Azraq') THEN 'Zarqa Governorate'
    WHEN title_en IN ('Irbid', 'Ramtha', 'Al Ardah', 'Hawara', 'Kafr Asad', 'Tayyibah', 'Al Mazar ash Shamali', 'Dayr Abi Said', 'Kafr Yuba', 'At Turrah', 'Al Wastiyyah', 'Al Husn', 'Bani Kinanah', 'Northern Jordan Valley') THEN 'Irbid Governorate'
    WHEN title_en IN ('Balqa', 'As-Salt', 'Fuheis', 'Ain al Basha', 'Ash Shunah al Janubiyyah', 'Ash Shunah ash Shamaliyyah', 'Dayr Alla', 'Central Jordan Valley') THEN 'Balqa Governorate'
    WHEN title_en IN ('Karak', 'Al Mazar al Janubi', 'Ar Rabbah', 'Ay', 'Al Qatranah', 'Southern Jordan Valley') THEN 'Karak Governorate'
    WHEN title_en IN ('Ma\'an', 'Ash Shawbak', 'Wadi Musa', 'Al Ays') THEN 'Ma\'an Governorate'
    WHEN title_en IN ('Mafraq', 'Zaatari') THEN 'Mafraq Governorate'
    WHEN title_en IN ('Jerash', 'Dibbin') THEN 'Jerash Governorate'
    WHEN title_en IN ('Ajloun', 'Barma', 'Kufranjah') THEN 'Ajloun Governorate'
    ELSE 'Other'
  END as governorate,
  COUNT(*) as city_count
FROM cities
GROUP BY governorate
ORDER BY city_count DESC;

-- Success message
SELECT 'Jordan cities update completed successfully!' as status;
