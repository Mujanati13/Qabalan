import { api } from './authService';

class StaffRoleService {
  // =====================================
  // ROLE MANAGEMENT
  // =====================================

  async getAllRoles() {
    try {
      const response = await api.get('/staff-roles/roles');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch roles');
    }
  }

  async getRoleById(roleId) {
    try {
      const response = await api.get(`/staff-roles/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch role');
    }
  }

  async createRole(roleData) {
    try {
      const response = await api.post('/staff-roles/roles', roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create role');
    }
  }

  async updateRole(roleId, roleData) {
    try {
      const response = await api.put(`/staff-roles/roles/${roleId}`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update role');
    }
  }

  async deleteRole(roleId) {
    try {
      const response = await api.delete(`/staff-roles/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete role');
    }
  }

  // =====================================
  // STAFF MANAGEMENT
  // =====================================

  async getAllStaff(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/staff-roles/staff?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch staff');
    }
  }

  async getStaffById(staffId) {
    try {
      const response = await api.get(`/staff-roles/staff/${staffId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch staff member');
    }
  }

  async createStaff(staffData) {
    try {
      const response = await api.post('/staff-roles/staff', staffData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create staff member');
    }
  }

  async updateStaff(staffId, staffData) {
    try {
      const response = await api.put(`/staff-roles/staff/${staffId}`, staffData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update staff member');
    }
  }

  async deleteStaff(staffId) {
    try {
      const response = await api.delete(`/staff-roles/staff/${staffId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete staff member');
    }
  }

  // =====================================
  // ROLE ASSIGNMENT
  // =====================================

  async assignRoles(staffId, roleIds, expiresAt = null) {
    try {
      const response = await api.post(`/staff-roles/staff/${staffId}/roles`, { 
        roles: roleIds,
        expires_at: expiresAt 
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to assign roles');
    }
  }

  async bulkAssignRoles(userIds, roleIds, expiresAt = null) {
    try {
      const response = await api.post('/staff-roles/bulk-assign-roles', {
        user_ids: userIds,
        role_ids: roleIds,
        expires_at: expiresAt
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to bulk assign roles');
    }
  }

  async assignTemporaryRole(staffId, roleId, expiresAt) {
    try {
      const response = await api.post(`/staff-roles/staff/${staffId}/temporary-role`, {
        role_id: roleId,
        expires_at: expiresAt
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to assign temporary role');
    }
  }

  async getAssignmentHistory(userId = null, limit = 50) {
    try {
      const url = userId 
        ? `/staff-roles/assignment-history/${userId}?limit=${limit}`
        : `/staff-roles/assignment-history?limit=${limit}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch assignment history');
    }
  }

  async getExpiringRoles(days = 7) {
    try {
      const response = await api.get(`/staff-roles/expiring-roles?days=${days}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch expiring roles');
    }
  }

  async getRoleTemplates() {
    try {
      const response = await api.get('/staff-roles/role-templates');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch role templates');
    }
  }

  async applyRoleTemplate(templateId, userIds, expiresAt = null) {
    try {
      const response = await api.post('/staff-roles/apply-template', {
        template_id: templateId,
        user_ids: userIds,
        expires_at: expiresAt
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to apply role template');
    }
  }

  async removeRole(staffId, roleId) {
    try {
      const response = await api.delete(`/staff-roles/staff/${staffId}/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove role');
    }
  }

  // =====================================
  // PERMISSIONS & UTILITIES
  // =====================================

  async getUserPermissions(userId) {
    try {
      const response = await api.get(`/staff-roles/permissions/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch permissions');
    }
  }

  async getDepartments() {
    try {
      const response = await api.get('/staff-roles/departments');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch departments');
    }
  }

  async getManagers() {
    try {
      const response = await api.get('/staff-roles/managers');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch managers');
    }
  }

  async getStatistics() {
    try {
      const response = await api.get('/staff-roles/statistics');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }

  async getActivityLogs(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/staff-roles/logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch activity logs');
    }
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  getEmploymentTypeLabel(type) {
    const types = {
      'full_time': 'Full Time',
      'part_time': 'Part Time',
      'contract': 'Contract',
      'intern': 'Intern'
    };
    return types[type] || type;
  }

  getUserTypeLabel(type) {
    const types = {
      'admin': 'Administrator',
      'staff': 'Staff Member',
      'customer': 'Customer'
    };
    return types[type] || type;
  }

  getPermissionLabel(permission) {
    const permissions = {
      'can_read': 'Read',
      'can_create': 'Create',
      'can_update': 'Update',
      'can_delete': 'Delete',
      'can_export': 'Export',
      'can_manage': 'Manage'
    };
    return permissions[permission] || permission;
  }

  getModuleLabel(module) {
    const modules = {
      'dashboard': 'Dashboard',
      'users': 'Users',
      'staff': 'Staff Management',
      'roles': 'Role Management',
      'products': 'Products',
      'categories': 'Categories',
      'orders': 'Orders',
      'invoices': 'Invoices',
      'payments': 'Payments',
      'inventory': 'Inventory',
      'promos': 'Promotions',
      'notifications': 'Notifications',
      'support': 'Support',
      'reports': 'Reports',
      'settings': 'Settings',
      'logs': 'Activity Logs'
    };
    return modules[module] || module;
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount) {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Available modules for permission management
  getAvailableModules() {
    return [
      { value: 'dashboard', label: 'Dashboard' },
      { value: 'users', label: 'Users' },
      { value: 'staff', label: 'Staff Management' },
      { value: 'roles', label: 'Role Management' },
      { value: 'products', label: 'Products' },
      { value: 'categories', label: 'Categories' },
      { value: 'orders', label: 'Orders' },
      { value: 'invoices', label: 'Invoices' },
      { value: 'payments', label: 'Payments' },
      { value: 'inventory', label: 'Inventory' },
      { value: 'promos', label: 'Promotions' },
      { value: 'notifications', label: 'Notifications' },
      { value: 'support', label: 'Support' },
      { value: 'reports', label: 'Reports' },
      { value: 'settings', label: 'Settings' },
      { value: 'logs', label: 'Activity Logs' }
    ];
  }

  // Available permissions
  getAvailablePermissions() {
    return [
      { value: 'can_read', label: 'Read' },
      { value: 'can_create', label: 'Create' },
      { value: 'can_update', label: 'Update' },
      { value: 'can_delete', label: 'Delete' },
      { value: 'can_export', label: 'Export' },
      { value: 'can_manage', label: 'Manage' }
    ];
  }

  // Employment types
  getEmploymentTypes() {
    return [
      { value: 'full_time', label: 'Full Time' },
      { value: 'part_time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'intern', label: 'Intern' }
    ];
  }

  // User types
  getUserTypes() {
    return [
      { value: 'admin', label: 'Administrator' },
      { value: 'staff', label: 'Staff Member' }
    ];
  }
}

export default new StaffRoleService();
