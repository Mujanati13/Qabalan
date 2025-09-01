ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) NULL AFTER payment_method,
  ADD COLUMN IF NOT EXISTS payment_session_id VARCHAR(100) NULL AFTER payment_provider;
