-- Migration: Enhanced Staff & Role Control System
-- Date: 2025-07-04

-- Create roles table for predefined roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_roles_active (is_active),
    INDEX idx_roles_system (is_system_role)
);

-- Create role_permissions table for role-based permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    can_manage BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_module (role_id, module),
    INDEX idx_role_permissions_module (module)
);

-- Create user_roles table for assigning roles to users
CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user_roles_active (is_active),
    INDEX idx_user_roles_expires (expires_at)
);

-- Create staff_profiles table for additional staff information
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id INT NULL,
    hire_date DATE,
    salary DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
    work_schedule JSON,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(30),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_staff_user (user_id),
    INDEX idx_staff_employee_id (employee_id),
    INDEX idx_staff_department (department),
    INDEX idx_staff_manager (manager_id)
);

-- Create activity_logs table for tracking staff actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_module (module),
    INDEX idx_activity_logs_action (action),
    INDEX idx_activity_logs_created (created_at)
);

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE),
('admin', 'Administrator', 'General administrator with most permissions', TRUE),
('manager', 'Manager', 'Department manager with limited admin access', TRUE),
('staff', 'Staff Member', 'Basic staff access to assigned modules', TRUE),
('viewer', 'Viewer', 'Read-only access to assigned modules', TRUE);

-- Define available modules
INSERT INTO role_permissions (role_id, module, can_read, can_create, can_update, can_delete, can_export, can_manage) VALUES
-- Super Admin permissions (role_id = 1)
(1, 'dashboard', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'users', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'staff', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'roles', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'categories', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'orders', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'invoices', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'payments', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'inventory', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'promos', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'notifications', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'support', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'reports', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'settings', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 'logs', TRUE, FALSE, FALSE, TRUE, TRUE, TRUE),

-- Admin permissions (role_id = 2)
(2, 'dashboard', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
(2, 'users', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 'staff', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(2, 'products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, 'categories', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, 'orders', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 'invoices', TRUE, TRUE, FALSE, FALSE, TRUE, FALSE),
(2, 'payments', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE),
(2, 'inventory', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 'promos', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, 'notifications', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, 'support', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 'reports', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
(2, 'settings', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE),

-- Manager permissions (role_id = 3)
(3, 'dashboard', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
(3, 'users', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE),
(3, 'products', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(3, 'categories', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(3, 'orders', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(3, 'invoices', TRUE, TRUE, FALSE, FALSE, TRUE, FALSE),
(3, 'inventory', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(3, 'promos', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(3, 'support', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
(3, 'reports', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),

-- Staff permissions (role_id = 4)
(4, 'dashboard', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
(4, 'products', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE),
(4, 'orders', TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
(4, 'support', TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),

-- Viewer permissions (role_id = 5)
(5, 'dashboard', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
(5, 'products', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
(5, 'orders', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
(5, 'reports', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE);

-- Update existing admin users to have super_admin role
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT 
    u.id as user_id,
    1 as role_id,
    u.id as assigned_by,
    NOW() as assigned_at
FROM users u 
WHERE u.user_type = 'admin' 
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
