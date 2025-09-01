ALTER TABLE orders 
MODIFY COLUMN order_status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending';
