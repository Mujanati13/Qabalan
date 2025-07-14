const express = require('express');
const router = express.Router();
const staffRoleService = require('../services/staffRoleService');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware to check admin/manager permissions
const requirePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (req.user.user_type === 'admin') {
        return next(); // Admins have all permissions for now
      }

      const hasPermission = await staffRoleService.checkPermission(req.user.id, module, action);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${action} on ${module}`
        });
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// Validation middleware
const validateRole = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Role name must be 2-50 characters'),
  body('display_name').trim().isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
];

const validateStaff = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('first_name').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('last_name').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('user_type').isIn(['admin', 'staff']).withMessage('User type must be admin or staff'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// =====================================
// ROLE MANAGEMENT ROUTES
// =====================================

// Get all roles
router.get('/roles', authenticate, requirePermission('roles', 'can_read'), async (req, res) => {
  try {
    const roles = await staffRoleService.getAllRoles();
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

// Get role by ID
router.get('/roles/:id', authenticate, requirePermission('roles', 'can_read'), async (req, res) => {
  try {
    const role = await staffRoleService.getRoleById(req.params.id);
    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
      error: error.message
    });
  }
});

// Create new role
router.post('/roles', authenticate, requirePermission('roles', 'can_create'), validateRole, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const role = await staffRoleService.createRole(req.body);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'create', 'roles', 'role', role.id, null, req.body, req.ip, req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
});

// Update role
router.put('/roles/:id', authenticate, requirePermission('roles', 'can_update'), validateRole, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const oldRole = await staffRoleService.getRoleById(req.params.id);
    const role = await staffRoleService.updateRole(req.params.id, req.body);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'update', 'roles', 'role', role.id, oldRole, req.body, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
});

// Delete role
router.delete('/roles/:id', authenticate, requirePermission('roles', 'can_delete'), async (req, res) => {
  try {
    const oldRole = await staffRoleService.getRoleById(req.params.id);
    await staffRoleService.deleteRole(req.params.id);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'delete', 'roles', 'role', req.params.id, oldRole, null, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
});

// =====================================
// STAFF MANAGEMENT ROUTES
// =====================================

// Get all staff
router.get('/staff', authenticate, requirePermission('staff', 'can_read'), async (req, res) => {
  try {
    const filters = {
      department: req.query.department,
      employment_type: req.query.employment_type,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      search: req.query.search,
      limit: req.query.limit
    };

    const staff = await staffRoleService.getAllStaff(filters);
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff',
      error: error.message
    });
  }
});

// Get staff by ID
router.get('/staff/:id', authenticate, requirePermission('staff', 'can_read'), async (req, res) => {
  try {
    const staff = await staffRoleService.getStaffById(req.params.id);
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff member',
      error: error.message
    });
  }
});

// Create new staff member
router.post('/staff', authenticate, requirePermission('staff', 'can_create'), validateStaff, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const staff = await staffRoleService.createStaff(req.body);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'create', 'staff', 'user', staff.id, null, 
      { ...req.body, password: '[REDACTED]' }, req.ip, req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: staff
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: error.message
    });
  }
});

// Update staff member
router.put('/staff/:id', authenticate, requirePermission('staff', 'can_update'), validateStaff, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const oldStaff = await staffRoleService.getStaffById(req.params.id);
    const staff = await staffRoleService.updateStaff(req.params.id, req.body);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'update', 'staff', 'user', staff.id, oldStaff, req.body, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: staff
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member',
      error: error.message
    });
  }
});

// Delete staff member (soft delete)
router.delete('/staff/:id', authenticate, requirePermission('staff', 'can_delete'), async (req, res) => {
  try {
    const oldStaff = await staffRoleService.getStaffById(req.params.id);
    await staffRoleService.deleteStaff(req.params.id);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'delete', 'staff', 'user', req.params.id, oldStaff, null, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate staff member',
      error: error.message
    });
  }
});

// =====================================
// ROLE ASSIGNMENT ROUTES
// =====================================

// Assign roles to user
router.post('/staff/:id/roles', authenticate, requirePermission('staff', 'can_manage'), async (req, res) => {
  try {
    const { roles } = req.body;
    
    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Roles must be an array of role IDs'
      });
    }

    await staffRoleService.assignRolesToUser(req.params.id, roles, req.user.id);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'assign_roles', 'staff', 'user', req.params.id, null, { roles }, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Roles assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign roles',
      error: error.message
    });
  }
});

// Remove role from user
router.delete('/staff/:id/roles/:roleId', authenticate, requirePermission('staff', 'can_manage'), async (req, res) => {
  try {
    await staffRoleService.removeRoleFromUser(req.params.id, req.params.roleId);
    
    // Log activity
    await staffRoleService.logActivity(
      req.user.id, 'remove_role', 'staff', 'user', req.params.id, null, 
      { roleId: req.params.roleId }, req.ip, req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Role removed successfully'
    });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove role',
      error: error.message
    });
  }
});

// =====================================
// PERMISSION & UTILITY ROUTES
// =====================================

// Get user permissions
router.get('/permissions/:userId', authenticate, async (req, res) => {
  try {
    // Users can only view their own permissions unless they're admin/manager
    if (req.user.id !== parseInt(req.params.userId) && req.user.user_type !== 'admin') {
      const canManage = await staffRoleService.checkPermission(req.user.id, 'staff', 'can_manage');
      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const permissions = await staffRoleService.getUserPermissions(req.params.userId);
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
});

// Get current user's permissions and roles
router.get('/my-permissions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // If user is admin, return all permissions
    if (req.user.user_type === 'admin') {
      const allPermissions = [
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
        'orders.view', 'orders.edit', 'orders.delete',
        'invoices.view', 'invoices.generate', 'invoices.export',
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'promos.view', 'promos.create', 'promos.edit', 'promos.delete',
        'notifications.view', 'notifications.create', 'notifications.send',
        'support.view', 'support.respond', 'support.manage',
        'staff.view', 'staff.create', 'staff.edit', 'staff.delete',
        'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
        'inventory.view', 'inventory.edit',
        'reports.view', 'reports.generate',
        'settings.view', 'settings.edit'
      ];
      
      return res.json({
        success: true,
        data: {
          permissions: allPermissions,
          roles: [{ name: 'admin', display_name: 'Administrator' }]
        }
      });
    }

    // For staff, get their actual permissions and roles
    const userRoles = await staffRoleService.getUserRoles(userId);
    const userPermissions = await staffRoleService.getUserPermissions(userId);
    
    res.json({
      success: true,
      data: {
        permissions: userPermissions,
        roles: userRoles
      }
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions',
      error: error.message
    });
  }
});

// Get departments
router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await staffRoleService.getDepartments();
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

// Get managers
router.get('/managers', authenticate, async (req, res) => {
  try {
    const managers = await staffRoleService.getManagers();
    res.json({
      success: true,
      data: managers
    });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managers',
      error: error.message
    });
  }
});

// Get staff statistics
router.get('/statistics', authenticate, requirePermission('staff', 'can_read'), async (req, res) => {
  try {
    const stats = await staffRoleService.getStaffStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get activity logs
router.get('/logs', authenticate, requirePermission('logs', 'can_read'), async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      module: req.query.module,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 100
    };

    const logs = await staffRoleService.getActivityLogs(filters);
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
});

module.exports = router;
