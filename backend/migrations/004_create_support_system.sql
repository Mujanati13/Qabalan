-- Migration: Create Support & Feedback System
-- Date: 2025-07-04

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    order_id INT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category ENUM('complaint', 'inquiry', 'compliment', 'technical', 'order_issue', 'other') DEFAULT 'inquiry',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_assigned_admin (assigned_admin_id)
);

-- Create support_replies table for admin responses
CREATE TABLE IF NOT EXISTS support_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    admin_id INT NULL,
    user_id INT NULL,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    is_internal_note BOOLEAN DEFAULT FALSE,
    attachments JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Create support_attachments table for file uploads
CREATE TABLE IF NOT EXISTS support_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    reply_id INT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_user_id INT NULL,
    uploaded_by_admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_id) REFERENCES support_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_reply_id (reply_id)
);

-- Create feedback table for general feedback/reviews
CREATE TABLE IF NOT EXISTS feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category ENUM('service', 'food_quality', 'delivery', 'app_experience', 'general') DEFAULT 'general',
    is_public BOOLEAN DEFAULT TRUE,
    admin_response TEXT NULL,
    responded_by_admin_id INT NULL,
    responded_at TIMESTAMP NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (responded_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_rating (rating),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create support_categories table for predefined categories
CREATE TABLE IF NOT EXISTS support_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(50) NULL,
    color VARCHAR(7) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
);

-- Create support_settings table for system configuration
CREATE TABLE IF NOT EXISTS support_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Insert default support categories
INSERT INTO support_categories (name, description, icon, color, sort_order) VALUES
('Order Issues', 'Problems with orders, missing items, wrong orders', 'shopping-cart', '#ff4757', 1),
('Delivery Issues', 'Late delivery, wrong address, delivery problems', 'truck', '#ff6b35', 2),
('Payment Issues', 'Payment failures, refunds, billing questions', 'credit-card', '#3742fa', 3),
('Food Quality', 'Food quality complaints, allergies, special requests', 'utensils', '#2ed573', 4),
('Technical Support', 'App bugs, login issues, technical problems', 'bug', '#ffa502', 5),
('Account Issues', 'Profile updates, password reset, account problems', 'user', '#5352ed', 6),
('General Inquiry', 'General questions and information requests', 'question-circle', '#747d8c', 7),
('Compliments', 'Positive feedback and compliments', 'heart', '#ff3838', 8);

-- Insert default support settings
INSERT INTO support_settings (setting_key, setting_value, description) VALUES
('auto_assign_tickets', 'false', 'Automatically assign tickets to available admins'),
('default_priority', 'medium', 'Default priority for new tickets'),
('notification_enabled', 'true', 'Enable email notifications for new tickets'),
('max_file_size', '5242880', 'Maximum file size for attachments in bytes (5MB)'),
('allowed_file_types', 'jpg,jpeg,png,pdf,doc,docx,txt', 'Allowed file extensions for attachments'),
('ticket_number_prefix', 'TKT', 'Prefix for ticket numbers'),
('auto_close_resolved_days', '7', 'Auto-close resolved tickets after X days');
