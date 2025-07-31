-- Create Jordan Cities, Areas, and Streets
-- Migration: 011_create_jordan_locations.sql

-- Create cities table if not exists
CREATE TABLE IF NOT EXISTS cities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title_en VARCHAR(100) NOT NULL,
    title_ar VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    delivery_fee DECIMAL(8, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create areas table if not exists
CREATE TABLE IF NOT EXISTS areas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    city_id INT NOT NULL,
    title_en VARCHAR(100) NOT NULL,
    title_ar VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    delivery_fee DECIMAL(8, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    INDEX idx_city_id (city_id)
);

-- Create streets table if not exists
CREATE TABLE IF NOT EXISTS streets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    area_id INT NOT NULL,
    title_en VARCHAR(100) NOT NULL,
    title_ar VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    delivery_fee DECIMAL(8, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
    INDEX idx_area_id (area_id)
);

-- Insert Jordan cities
INSERT INTO cities (title_en, title_ar, code, latitude, longitude, delivery_fee) VALUES
('Amman', 'عمان', 'AM', 31.9539, 35.9106, 2.50),
('Zarqa', 'الزرقاء', 'ZA', 32.0728, 36.0876, 3.00),
('Irbid', 'اربد', 'IR', 32.5556, 35.8500, 4.00),
('Russeifa', 'الرصيفة', 'RU', 32.0167, 36.0500, 3.00),
('Al Salt', 'السلط', 'AS', 32.0389, 35.7272, 3.50),
('Aqaba', 'العقبة', 'AQ', 29.5321, 35.0063, 8.00),
('Madaba', 'مادبا', 'MA', 31.7167, 35.7833, 4.00),
('Jerash', 'جرش', 'JE', 32.2806, 35.8992, 4.50),
('Al Karak', 'الكرك', 'KA', 31.1833, 35.7000, 5.00),
('Ajloun', 'عجلون', 'AJ', 32.3333, 35.7500, 5.00),
('Mafraq', 'المفرق', 'MF', 32.3436, 36.2581, 5.50),
('Tafilah', 'الطفيلة', 'TA', 30.8389, 35.6044, 6.00);

-- Insert Amman areas
INSERT INTO areas (city_id, title_en, title_ar, latitude, longitude, delivery_fee) VALUES
-- Amman areas
(1, 'Abdoun', 'عبدون', 31.9406, 35.9000, 2.50),
(1, 'Jabal Amman', 'جبل عمان', 31.9515, 35.9239, 2.50),
(1, 'Shmeisani', 'الشميساني', 31.9656, 35.9239, 2.50),
(1, 'Sweifieh', 'السويفية', 31.9239, 35.8706, 2.50),
(1, 'Dabouq', 'دابوق', 31.9781, 35.8506, 2.50),
(1, 'Khalda', 'خلدا', 31.9581, 35.8206, 2.50),
(1, 'Marj Al Hamam', 'مرج الحمام', 31.8506, 35.8706, 2.50),
(1, 'Tabarbour', 'طبربور', 32.0406, 35.9506, 2.50),
(1, 'Naour', 'ناعور', 31.8906, 35.8206, 2.50),
(1, 'Um Summaq', 'أم السماق', 31.9906, 35.9006, 2.50),
(1, 'Tla Al Ali', 'تلاع العلي', 31.9706, 35.8906, 2.50),
(1, 'Al Jubeiha', 'الجبيهة', 32.0106, 35.8906, 2.50),
(1, 'Mecca Street', 'شارع مكة', 31.9406, 35.9106, 2.50),
(1, 'University Street', 'شارع الجامعة', 31.9506, 35.9206, 2.50),
(1, 'Rabia', 'الرابية', 31.9806, 35.8806, 2.50),
(1, 'Kursi', 'الكرسي', 31.9106, 35.8406, 2.50),
(1, 'Sports City', 'المدينة الرياضية', 31.9306, 35.9406, 2.50),
(1, 'Wadi Seer', 'وادي السير', 31.9006, 35.8106, 2.50),
(1, 'Abu Nseir', 'أبو نصير', 32.0306, 35.8706, 2.50),
(1, 'Mahes', 'ماحص', 31.8706, 35.7906, 2.50);

-- Insert Zarqa areas
INSERT INTO areas (city_id, title_en, title_ar, latitude, longitude, delivery_fee) VALUES
(2, 'Zarqa Center', 'وسط الزرقاء', 32.0728, 36.0876, 3.00),
(2, 'New Zarqa', 'الزرقاء الجديدة', 32.0828, 36.0976, 3.00),
(2, 'Hashemite University', 'الجامعة الهاشمية', 32.1128, 36.1076, 3.00),
(2, 'Al Azraq', 'الأزرق', 31.8828, 36.8276, 3.00);

-- Insert Irbid areas
INSERT INTO areas (city_id, title_en, title_ar, latitude, longitude, delivery_fee) VALUES
(3, 'Irbid Center', 'وسط اربد', 32.5556, 35.8500, 4.00),
(3, 'Jordan University', 'الجامعة الأردنية', 32.5656, 35.8600, 4.00),
(3, 'Al Husn', 'الحصن', 32.5256, 35.8200, 4.00),
(3, 'Ramtha', 'الرمثا', 32.5656, 36.0000, 4.00);

-- Insert sample streets for Amman areas
INSERT INTO streets (area_id, title_en, title_ar, latitude, longitude, delivery_fee) VALUES
-- Abdoun streets
(1, 'Abdoun Circle', 'دوار عبدون', 31.9406, 35.9000, 2.50),
(1, 'Abdoun Bridge', 'جسر عبدون', 31.9356, 35.9050, 2.50),
(1, 'Fourth Circle', 'الدوار الرابع', 31.9456, 35.8950, 2.50),

-- Jabal Amman streets
(2, 'Rainbow Street', 'شارع الرينبو', 31.9515, 35.9239, 2.50),
(2, 'First Circle', 'الدوار الأول', 31.9565, 35.9289, 2.50),
(2, 'Second Circle', 'الدوار الثاني', 31.9465, 35.9189, 2.50),
(2, 'Third Circle', 'الدوار الثالث', 31.9415, 35.9139, 2.50),

-- Shmeisani streets
(3, 'Shmeisani Main', 'الشميساني الرئيسي', 31.9656, 35.9239, 2.50),
(3, 'Abdul Hamid Sharaf', 'عبد الحميد شرف', 31.9706, 35.9289, 2.50),
(3, 'King Hussein', 'الملك حسين', 31.9606, 35.9189, 2.50),

-- Sweifieh streets
(4, 'Sweifieh Main', 'السويفية الرئيسي', 31.9239, 35.8706, 2.50),
(4, 'Wakalat Street', 'شارع الوكالات', 31.9289, 35.8756, 2.50),
(4, 'Galleria Mall', 'جاليريا مول', 31.9189, 35.8656, 2.50),

-- Khalda streets
(6, 'Khalda Main', 'خلدا الرئيسي', 31.9581, 35.8206, 2.50),
(6, 'Computer Street', 'شارع الكمبيوتر', 31.9631, 35.8256, 2.50),
(6, 'Queen Rania', 'الملكة رانيا', 31.9531, 35.8156, 2.50);

-- Add indexes for better performance
CREATE INDEX idx_cities_active ON cities(is_active);
CREATE INDEX idx_areas_active ON areas(is_active);
CREATE INDEX idx_streets_active ON streets(is_active);
CREATE INDEX idx_cities_title_en ON cities(title_en);
CREATE INDEX idx_areas_title_en ON areas(title_en);
CREATE INDEX idx_streets_title_en ON streets(title_en);
