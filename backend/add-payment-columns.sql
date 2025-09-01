-- Add currency column to orders table if it doesn't exist
-- Run this SQL script in your database to add the missing currency column

-- Check if currency column exists and add it if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'currency';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE orders ADD COLUMN currency VARCHAR(3) DEFAULT "USD" AFTER total_amount',
  'SELECT "Currency column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Also add payment-related columns if they don't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'payment_provider';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(50) NULL AFTER currency',
  'SELECT "Payment provider column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'payment_session_id';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE orders ADD COLUMN payment_session_id VARCHAR(255) NULL AFTER payment_provider',
  'SELECT "Payment session ID column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'payment_success_indicator';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE orders ADD COLUMN payment_success_indicator VARCHAR(255) NULL AFTER payment_session_id',
  'SELECT "Payment success indicator column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'payment_method';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) NULL AFTER payment_success_indicator',
  'SELECT "Payment method column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final table structure
DESCRIBE orders;
