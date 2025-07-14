-- Settings table migration
-- This table stores application settings organized by categories

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  setting_type ENUM('text', 'number', 'boolean', 'json', 'email', 'password', 'url') DEFAULT 'text',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_setting (setting_key, category),
  INDEX idx_category (category),
  INDEX idx_setting_key (setting_key)
);

-- Insert default settings
INSERT IGNORE INTO settings (setting_key, setting_value, category, description, setting_type, is_public) VALUES
-- General Settings
('site_name', 'FECS Admin', 'general', 'Application name displayed in the interface', 'text', false),
('site_description', 'Food E-Commerce System', 'general', 'Brief description of the application', 'text', false),
('timezone', 'UTC', 'general', 'Default timezone for the application', 'text', false),
('date_format', 'YYYY-MM-DD', 'general', 'Default date format', 'text', false),
('currency', 'USD', 'general', 'Default currency code', 'text', false),
('currency_symbol', '$', 'general', 'Currency symbol', 'text', false),
('language', 'en', 'general', 'Default language', 'text', false),

-- Email Settings
('smtp_host', '', 'email', 'SMTP server hostname', 'text', false),
('smtp_port', '587', 'email', 'SMTP server port', 'number', false),
('smtp_user', '', 'email', 'SMTP username', 'email', false),
('smtp_password', '', 'email', 'SMTP password', 'password', false),
('smtp_encryption', 'tls', 'email', 'SMTP encryption method (tls/ssl)', 'text', false),
('from_email', '', 'email', 'Default from email address', 'email', false),
('from_name', 'FECS System', 'email', 'Default from name', 'text', false),

-- Notification Settings
('enable_email_notifications', 'true', 'notification', 'Enable email notifications', 'boolean', false),
('enable_push_notifications', 'true', 'notification', 'Enable push notifications', 'boolean', false),
('enable_sms_notifications', 'false', 'notification', 'Enable SMS notifications', 'boolean', false),
('order_notifications', 'true', 'notification', 'Send notifications for order updates', 'boolean', false),
('admin_notifications', 'true', 'notification', 'Send notifications to administrators', 'boolean', false),

-- Order Settings
('default_order_status', 'pending', 'order', 'Default status for new orders', 'text', false),
('auto_accept_orders', 'false', 'order', 'Automatically accept new orders', 'boolean', false),
('order_timeout_minutes', '30', 'order', 'Order timeout in minutes', 'number', false),
('max_order_items', '50', 'order', 'Maximum items per order', 'number', false),
('allow_order_cancellation', 'true', 'order', 'Allow customers to cancel orders', 'boolean', false),

-- Payment Settings
('enable_cash_payment', 'true', 'payment', 'Enable cash on delivery', 'boolean', false),
('enable_card_payment', 'true', 'payment', 'Enable credit/debit card payments', 'boolean', false),
('enable_online_payment', 'false', 'payment', 'Enable online payment gateways', 'boolean', false),
('tax_rate', '0.00', 'payment', 'Default tax rate percentage', 'number', false),
('delivery_fee', '0.00', 'payment', 'Default delivery fee', 'number', false),

-- Security Settings
('session_timeout', '3600', 'security', 'Session timeout in seconds', 'number', false),
('max_login_attempts', '5', 'security', 'Maximum login attempts before lockout', 'number', false),
('password_min_length', '8', 'security', 'Minimum password length', 'number', false),
('require_password_special_chars', 'true', 'security', 'Require special characters in passwords', 'boolean', false),
('enable_two_factor_auth', 'false', 'security', 'Enable two-factor authentication', 'boolean', false),

-- API Settings
('api_rate_limit', '100', 'api', 'API requests per minute limit', 'number', false),
('api_timeout', '30', 'api', 'API request timeout in seconds', 'number', false),
('enable_api_logging', 'true', 'api', 'Enable API request logging', 'boolean', false),

-- Maintenance Settings
('maintenance_mode', 'false', 'maintenance', 'Enable maintenance mode', 'boolean', false),
('maintenance_message', 'System is under maintenance. Please try again later.', 'maintenance', 'Maintenance mode message', 'text', false),
('backup_frequency', 'daily', 'maintenance', 'Database backup frequency', 'text', false),
('log_retention_days', '30', 'maintenance', 'Number of days to retain logs', 'number', false);
