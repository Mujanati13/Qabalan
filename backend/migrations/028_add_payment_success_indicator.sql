-- Add payment_success_indicator column to store MPGS successIndicator for verification
ALTER TABLE orders 
ADD COLUMN payment_success_indicator VARCHAR(255) DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX idx_orders_payment_session ON orders(payment_session_id);
CREATE INDEX idx_orders_payment_success_indicator ON orders(payment_success_indicator);
