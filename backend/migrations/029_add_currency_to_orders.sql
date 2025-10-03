SET @has_currency_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'currency'
);

SET @add_currency_sql := IF(
  @has_currency_column = 0,
  'ALTER TABLE orders ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT ''JOD'' AFTER total_amount',
  'SELECT "orders.currency column already exists"'
);

PREPARE add_currency_stmt FROM @add_currency_sql;
EXECUTE add_currency_stmt;
DEALLOCATE PREPARE add_currency_stmt;

UPDATE orders
SET currency = 'JOD'
WHERE currency IS NULL OR currency = '';

SET @has_currency_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_currency'
);

SET @add_currency_index_sql := IF(
  @has_currency_index = 0,
  'CREATE INDEX idx_orders_currency ON orders(currency)',
  'SELECT "idx_orders_currency already exists"'
);

PREPARE add_currency_index_stmt FROM @add_currency_index_sql;
EXECUTE add_currency_index_stmt;
DEALLOCATE PREPARE add_currency_index_stmt;
