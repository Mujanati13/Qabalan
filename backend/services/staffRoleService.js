const { executeQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class StaffRoleService {
  // =====================================
  // ROLE MANAGEMENT
  // =====================================

  async getAllRoles() {
    try {
      const roles = await executeQuery(`
        SELECT 
          r.*,
          COUNT(ur.id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = TRUE
        WHERE r.is_active = TRUE
        GROUP BY r.id
        ORDER BY r.is_system_role DESC, r.name ASC
      `);
      return roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  async getRoleById(roleId) {
    try {
      const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
      if (!role) {
        throw new Error('Role not found');
      }

      // Get role permissions
      const permissions = await executeQuery(`
        SELECT module, can_read, can_create, can_update, can_delete, can_export, can_manage
        FROM role_permissions 
        WHERE role_id = ?
        ORDER BY module ASC
      `, [roleId]);

      return { ...role, permissions };
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
    }
  }

  async createRole(roleData) {
    try {
      const { name, display_name, description, permissions } = roleData;

      // Create role
      const result = await executeQuery(`
        INSERT INTO roles (name, display_name, description, is_system_role)
        VALUES (?, ?, ?, FALSE)
      `, [name, display_name, description]);

      const roleId = result.insertId;

      // Add permissions
      if (permissions && permissions.length > 0) {
        await this.updateRolePermissions(roleId, permissions);
      }

      return await this.getRoleById(roleId);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(roleId, roleData) {
    try {
      const { display_name, description, permissions } = roleData;

      // Check if role exists and is not system role
      const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
      if (!role) {
        throw new Error('Role not found');
      }
      if (role.is_system_role) {
        throw new Error('Cannot modify system roles');
      }

      // Update role
      await executeQuery(`
        UPDATE roles 
        SET display_name = ?, description = ?, updated_at = NOW()
        WHERE id = ?
      `, [display_name, description, roleId]);

      // Update permissions
      if (permissions) {
        await this.updateRolePermissions(roleId, permissions);
      }

      return await this.getRoleById(roleId);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(roleId) {
    try {
      // Check if role exists and is not system role
      const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
      if (!role) {
        throw new Error('Role not found');
      }
      if (role.is_system_role) {
        throw new Error('Cannot delete system roles');
      }

      // Check if role is assigned to users
      const [userCount] = await executeQuery(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ? AND is_active = TRUE',
        [roleId]
      );
      if (userCount.count > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Delete role (cascades to permissions)
      await executeQuery('DELETE FROM roles WHERE id = ?', [roleId]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  async updateRolePermissions(roleId, permissions) {
    try {
      // Delete existing permissions
      await executeQuery('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      // Insert new permissions
      for (const perm of permissions) {
        await executeQuery(`
          INSERT INTO role_permissions 
          (role_id, module, can_read, can_create, can_update, can_delete, can_export, can_manage)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          roleId,
          perm.module,
          perm.can_read || false,
          perm.can_create || false,
          perm.can_update || false,
          perm.can_delete || false,
          perm.can_export || false,
          perm.can_manage || false
        ]);
      }
    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  // =====================================
  // STAFF MANAGEMENT
  // =====================================

  async getAllStaff(filters = {}) {
    try {
      let query = `
        SELECT 
          u.id,
          u.email,
          u.phone,
          u.first_name,
          u.last_name,
          CONCAT(u.first_name, ' ', u.last_name) as full_name,
          u.user_type,
          u.is_active,
          u.last_login_at,
          u.created_at,
          sp.employee_id,
          sp.department,
          sp.position,
          sp.hire_date,
          sp.employment_type,
          sp.notes,
          manager.first_name as manager_first_name,
          manager.last_name as manager_last_name
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        LEFT JOIN users manager ON sp.manager_id = manager.id
        WHERE u.user_type IN ('admin', 'staff')
      `;

      const params = [];

      if (filters.department) {
        query += ' AND sp.department = ?';
        params.push(filters.department);
      }

      if (filters.employment_type) {
        query += ' AND sp.employment_type = ?';
        params.push(filters.employment_type);
      }

      if (filters.status === 'active') {
        query += ' AND u.is_active = 1';
      } else if (filters.status === 'inactive') {
        query += ' AND u.is_active = 0';
      }

      if (filters.search) {
        query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR sp.employee_id LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY u.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const staff = await executeQuery(query, params);

      // Get roles for each staff member
      for (let staffMember of staff) {
        const roles = await executeQuery(`
          SELECT r.id, r.name, r.display_name, r.description
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = ? AND ur.is_active = TRUE
          ORDER BY r.display_name
        `, [staffMember.id]);
        
        staffMember.roles = roles || [];
      }

      return staff;
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  }

  async getStaffById(staffId) {
    try {
      const [staff] = await executeQuery(`
        SELECT 
          u.*,
          sp.*,
          manager.first_name as manager_first_name,
          manager.last_name as manager_last_name
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        LEFT JOIN users manager ON sp.manager_id = manager.id
        WHERE u.id = ? AND u.user_type IN ('admin', 'staff')
      `, [staffId]);

      if (!staff) {
        throw new Error('Staff member not found');
      }

      // Get staff roles
      const roles = await executeQuery(`
        SELECT r.*, ur.assigned_at, ur.expires_at, ur.is_active
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
        ORDER BY ur.assigned_at DESC
      `, [staffId]);

      return { ...staff, roles };
    } catch (error) {
      console.error('Error fetching staff member:', error);
      throw error;
    }
  }

  async createStaff(staffData) {
    try {
      const {
        email, phone, password, first_name, last_name, user_type,
        employee_id, department, position, manager_id, hire_date,
        employment_type, salary, hourly_rate, work_schedule,
        emergency_contact_name, emergency_contact_phone, notes,
        roles = []
      } = staffData;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const userResult = await executeQuery(`
        INSERT INTO users 
        (email, phone, password_hash, first_name, last_name, user_type, is_verified, is_active)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)
      `, [email, phone, hashedPassword, first_name, last_name, user_type]);

      const userId = userResult.insertId;

      // Create staff profile
      await executeQuery(`
        INSERT INTO staff_profiles 
        (user_id, employee_id, department, position, manager_id, hire_date, 
         employment_type, salary, hourly_rate, work_schedule, 
         emergency_contact_name, emergency_contact_phone, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, employee_id, department, position, manager_id, hire_date,
        employment_type, salary, hourly_rate, JSON.stringify(work_schedule),
        emergency_contact_name, emergency_contact_phone, notes
      ]);

      // Assign roles
      if (roles.length > 0) {
        await this.assignRolesToUser(userId, roles, userId);
      }

      return await this.getStaffById(userId);
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  async updateStaff(staffId, staffData) {
    try {
      const {
        phone, first_name, last_name, is_active,
        employee_id, department, position, manager_id, hire_date,
        employment_type, salary, hourly_rate, work_schedule,
        emergency_contact_name, emergency_contact_phone, notes,
        roles
      } = staffData;

      // Update user
      await executeQuery(`
        UPDATE users 
        SET phone = ?, first_name = ?, last_name = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?
      `, [phone, first_name, last_name, is_active, staffId]);

      // Update or create staff profile
      const [existingProfile] = await executeQuery(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [staffId]
      );

      if (existingProfile) {
        await executeQuery(`
          UPDATE staff_profiles 
          SET employee_id = ?, department = ?, position = ?, manager_id = ?, 
              hire_date = ?, employment_type = ?, salary = ?, hourly_rate = ?,
              work_schedule = ?, emergency_contact_name = ?, emergency_contact_phone = ?,
              notes = ?, updated_at = NOW()
          WHERE user_id = ?
        `, [
          employee_id, department, position, manager_id, hire_date,
          employment_type, salary, hourly_rate, JSON.stringify(work_schedule),
          emergency_contact_name, emergency_contact_phone, notes, staffId
        ]);
      } else {
        await executeQuery(`
          INSERT INTO staff_profiles 
          (user_id, employee_id, department, position, manager_id, hire_date,
           employment_type, salary, hourly_rate, work_schedule,
           emergency_contact_name, emergency_contact_phone, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          staffId, employee_id, department, position, manager_id, hire_date,
          employment_type, salary, hourly_rate, JSON.stringify(work_schedule),
          emergency_contact_name, emergency_contact_phone, notes
        ]);
      }

      // Update roles if provided
      if (roles !== undefined) {
        await this.updateUserRoles(staffId, roles, staffId);
      }

      return await this.getStaffById(staffId);
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  }

  async deleteStaff(staffId) {
    try {
      // Check if staff exists
      const [staff] = await executeQuery(
        'SELECT * FROM users WHERE id = ? AND user_type IN ("admin", "staff")',
        [staffId]
      );
      if (!staff) {
        throw new Error('Staff member not found');
      }

      // Soft delete by deactivating
      await executeQuery('UPDATE users SET is_active = FALSE WHERE id = ?', [staffId]);
      await executeQuery('UPDATE user_roles SET is_active = FALSE WHERE user_id = ?', [staffId]);

      return { success: true };
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }

  // =====================================
  // ROLE ASSIGNMENT
  // =====================================

  async assignRoles(userId, roleIds) {
    try {
      return await this.assignRolesToUser(userId, roleIds, userId);
    } catch (error) {
      console.error('Error assigning roles:', error);
      throw error;
    }
  }

  async assignRolesToUser(userId, roleIds, assignedBy) {
    try {
      // Deactivate existing roles
      await executeQuery('UPDATE user_roles SET is_active = FALSE WHERE user_id = ?', [userId]);

      // Assign new roles
      for (const roleId of roleIds) {
        await executeQuery(`
          INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
          VALUES (?, ?, ?, TRUE)
          ON DUPLICATE KEY UPDATE is_active = TRUE, assigned_by = ?, assigned_at = NOW()
        `, [userId, roleId, assignedBy, assignedBy]);
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      throw error;
    }
  }

  async updateUserRoles(userId, roleIds, assignedBy) {
    try {
      return await this.assignRolesToUser(userId, roleIds, assignedBy);
    } catch (error) {
      console.error('Error updating user roles:', error);
      throw error;
    }
  }

  async removeRoleFromUser(userId, roleId) {
    try {
      await executeQuery(
        'UPDATE user_roles SET is_active = FALSE WHERE user_id = ? AND role_id = ?',
        [userId, roleId]
      );
      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }

  // =====================================
  // PERMISSIONS & ACCESS CONTROL
  // =====================================

  async getUserRoles(userId) {
    try {
      const roles = await executeQuery(`
        SELECT r.id, r.name, r.display_name, r.description
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ? AND ur.is_active = TRUE AND r.is_active = TRUE
        ORDER BY r.name
      `, [userId]);

      return roles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  async getUserPermissions(userId) {
    try {
      const permissions = await executeQuery(`
        SELECT DISTINCT
          rp.module,
          MAX(rp.can_read) as can_read,
          MAX(rp.can_create) as can_create,
          MAX(rp.can_update) as can_update,
          MAX(rp.can_delete) as can_delete,
          MAX(rp.can_export) as can_export,
          MAX(rp.can_manage) as can_manage
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = ? AND ur.is_active = TRUE
        GROUP BY rp.module
        ORDER BY rp.module
      `, [userId]);

      // Convert to permission string array
      const permissionStrings = [];
      permissions.forEach(perm => {
        const module = perm.module;
        if (perm.can_read) permissionStrings.push(`${module}.view`);
        if (perm.can_create) permissionStrings.push(`${module}.create`);
        if (perm.can_update) permissionStrings.push(`${module}.edit`);
        if (perm.can_delete) permissionStrings.push(`${module}.delete`);
        if (perm.can_export) permissionStrings.push(`${module}.export`);
        if (perm.can_manage) permissionStrings.push(`${module}.manage`);
      });

      return permissionStrings;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  async checkPermission(userId, module, action) {
    try {
      const [result] = await executeQuery(`
        SELECT MAX(rp.${action}) as has_permission
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = ? AND ur.is_active = TRUE AND rp.module = ?
      `, [userId, module]);

      return Boolean(result?.has_permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // =====================================
  // ACTIVITY LOGGING
  // =====================================

  async logActivity(userId, action, module, resourceType = null, resourceId = null, oldValues = null, newValues = null, ipAddress = null, userAgent = null) {
    try {
      await executeQuery(`
        INSERT INTO activity_logs 
        (user_id, action, module, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, action, module, resourceType, resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress, userAgent
      ]);
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error for logging failures
    }
  }

  async getActivityLogs(filters = {}) {
    try {
      let query = `
        SELECT 
          al.*,
          u.first_name,
          u.last_name,
          u.email
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.module) {
        query += ' AND al.module = ?';
        params.push(filters.module);
      }

      if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
      }

      if (filters.startDate) {
        query += ' AND al.created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND al.created_at <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY al.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      return await executeQuery(query, params);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  async getDepartments() {
    try {
      const departments = await executeQuery(`
        SELECT DISTINCT department, COUNT(*) as staff_count
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE u.is_active = TRUE AND department IS NOT NULL
        GROUP BY department
        ORDER BY department
      `);
      return departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  async getManagers() {
    try {
      const managers = await executeQuery(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          CONCAT(u.first_name, ' ', u.last_name) as full_name,
          sp.department,
          sp.position
        FROM users u
        JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE u.user_type IN ('admin', 'staff') AND u.is_active = TRUE
        ORDER BY u.first_name, u.last_name
      `);
      return managers;
    } catch (error) {
      console.error('Error fetching managers:', error);
      throw error;
    }
  }

  async getStaffStatistics() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_staff,
          COUNT(CASE WHEN u.is_active = TRUE THEN 1 END) as active_staff,
          COUNT(CASE WHEN u.user_type = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN u.user_type = 'staff' THEN 1 END) as staff_count,
          COUNT(CASE WHEN sp.employment_type = 'full_time' THEN 1 END) as full_time,
          COUNT(CASE WHEN sp.employment_type = 'part_time' THEN 1 END) as part_time,
          COUNT(CASE WHEN sp.employment_type = 'contract' THEN 1 END) as contract
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE u.user_type IN ('admin', 'staff')
      `);
      
      return stats[0];
    } catch (error) {
      console.error('Error fetching staff statistics:', error);
      throw error;
    }
  }
}

module.exports = new StaffRoleService();
