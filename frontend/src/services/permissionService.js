import { api } from './authService';

class PermissionService {
  constructor() {
    this.userPermissions = null;
    this.userRoles = null;
  }

  // Get current user's permissions
  async getUserPermissions() {
    try {
      const response = await api.get('/staff-roles/my-permissions');
      this.userPermissions = response.data.permissions || [];
      this.userRoles = response.data.roles || [];
      return {
        permissions: this.userPermissions,
        roles: this.userRoles
      };
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      this.userPermissions = [];
      this.userRoles = [];
      return {
        permissions: [],
        roles: []
      };
    }
  }

  // Check if user has specific permission
  hasPermission(permission) {
    if (!this.userPermissions) return false;
    return this.userPermissions.includes(permission);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(permissions) {
    if (!this.userPermissions) return false;
    return permissions.some(permission => this.userPermissions.includes(permission));
  }

  // Check if user has all specified permissions
  hasAllPermissions(permissions) {
    if (!this.userPermissions) return false;
    return permissions.every(permission => this.userPermissions.includes(permission));
  }

  // Check if user has specific role
  hasRole(role) {
    if (!this.userRoles) return false;
    return this.userRoles.some(userRole => userRole.name === role);
  }

  // Get menu items based on permissions
  getPermittedMenuItems(user, userPermissions = null) {
    if (!user) return [];

    // Use provided permissions or the cached ones
    const permissions = userPermissions || this.userPermissions || [];

    // Admin sees all menu items
    if (user.user_type === 'admin') {
      return [
        'dashboard',
        'products',
        'categories', 
        'orders',
        'invoices',
        'users',
        'promos',
        'notifications',
        'support',
        'staff',
        'inventory',
        'reports',
        'settings'
      ];
    }

    // Staff sees menu items based on permissions
    const menuItems = ['dashboard']; // Dashboard is always available

    // Check permissions for each module
    if (this.hasAnyPermissionInList(permissions, ['products.view', 'products.create', 'products.edit', 'products.delete'])) {
      menuItems.push('products');
    }

    if (this.hasAnyPermissionInList(permissions, ['categories.view', 'categories.create', 'categories.edit', 'categories.delete'])) {
      menuItems.push('categories');
    }

    if (this.hasAnyPermissionInList(permissions, ['orders.view', 'orders.edit', 'orders.delete'])) {
      menuItems.push('orders');
    }

    if (this.hasAnyPermissionInList(permissions, ['invoices.view', 'invoices.generate', 'invoices.export'])) {
      menuItems.push('invoices');
    }

    if (this.hasAnyPermissionInList(permissions, ['users.view', 'users.create', 'users.edit', 'users.delete'])) {
      menuItems.push('users');
    }

    if (this.hasAnyPermissionInList(permissions, ['promos.view', 'promos.create', 'promos.edit', 'promos.delete'])) {
      menuItems.push('promos');
    }

    if (this.hasAnyPermissionInList(permissions, ['notifications.view', 'notifications.create', 'notifications.send'])) {
      menuItems.push('notifications');
    }

    if (this.hasAnyPermissionInList(permissions, ['support.view', 'support.respond', 'support.manage'])) {
      menuItems.push('support');
    }

    if (this.hasAnyPermissionInList(permissions, ['staff.view', 'staff.create', 'staff.edit', 'roles.view', 'roles.create', 'roles.edit'])) {
      menuItems.push('staff');
    }

    if (this.hasAnyPermissionInList(permissions, ['inventory.view', 'inventory.edit'])) {
      menuItems.push('inventory');
    }

    if (this.hasAnyPermissionInList(permissions, ['reports.view', 'reports.generate'])) {
      menuItems.push('reports');
    }

    if (this.hasAnyPermissionInList(permissions, ['settings.view', 'settings.edit'])) {
      menuItems.push('settings');
    }

    return menuItems;
  }

  // Helper method to check permissions in a list
  hasAnyPermissionInList(permissionsList, requiredPermissions) {
    return requiredPermissions.some(permission => permissionsList.includes(permission));
  }

  // Check if user can access specific menu item
  canAccessMenuItem(menuItem) {
    const permittedItems = this.getPermittedMenuItems();
    return permittedItems.includes(menuItem);
  }

  // Permission constants for easy reference
  static PERMISSIONS = {
    // Products
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',

    // Categories
    CATEGORIES_VIEW: 'categories.view',
    CATEGORIES_CREATE: 'categories.create',
    CATEGORIES_EDIT: 'categories.edit',
    CATEGORIES_DELETE: 'categories.delete',

    // Orders
    ORDERS_VIEW: 'orders.view',
    ORDERS_EDIT: 'orders.edit',
    ORDERS_DELETE: 'orders.delete',

    // Invoices
    INVOICES_VIEW: 'invoices.view',
    INVOICES_GENERATE: 'invoices.generate',
    INVOICES_EXPORT: 'invoices.export',

    // Users
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',

    // Promo codes
    PROMOS_VIEW: 'promos.view',
    PROMOS_CREATE: 'promos.create',
    PROMOS_EDIT: 'promos.edit',
    PROMOS_DELETE: 'promos.delete',

    // Notifications
    NOTIFICATIONS_VIEW: 'notifications.view',
    NOTIFICATIONS_CREATE: 'notifications.create',
    NOTIFICATIONS_SEND: 'notifications.send',

    // Support
    SUPPORT_VIEW: 'support.view',
    SUPPORT_RESPOND: 'support.respond',
    SUPPORT_MANAGE: 'support.manage',

    // Staff & Roles
    STAFF_VIEW: 'staff.view',
    STAFF_CREATE: 'staff.create',
    STAFF_EDIT: 'staff.edit',
    STAFF_DELETE: 'staff.delete',
    ROLES_VIEW: 'roles.view',
    ROLES_CREATE: 'roles.create',
    ROLES_EDIT: 'roles.edit',
    ROLES_DELETE: 'roles.delete',

    // Inventory
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_EDIT: 'inventory.edit',

    // Reports
    REPORTS_VIEW: 'reports.view',
    REPORTS_GENERATE: 'reports.generate',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_EDIT: 'settings.edit'
  };

  // Clear cached permissions (useful on logout)
  clearPermissions() {
    this.userPermissions = null;
    this.userRoles = null;
  }
}

export const permissionService = new PermissionService();
export default permissionService;
