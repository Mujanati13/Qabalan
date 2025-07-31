const express = require('express');
const bcrypt = require('bcryptjs');
const { executeQuery, executeTransaction, getPaginatedResults } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination, validatePasswordChange, validateUserFilters, validateUserCreation } = require('../middleware/validation');

const router = express.Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validate user creation/update data
 */
const validateUserData = (req, res, next) => {
  const { 
    first_name, 
    last_name, 
    email, 
    phone, 
    user_type, 
    birth_date,
    notification_promo,
    notification_orders
  } = req.body;

  const errors = [];

  // Required fields for creation
  if (req.method === 'POST') {
    if (!first_name || first_name.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }
    if (!last_name || last_name.trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required');
    }
  }

  // Optional validations for update
  if (first_name !== undefined && first_name.trim().length < 2) {
    errors.push('First name must be at least 2 characters');
  }
  if (last_name !== undefined && last_name.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required');
  }
  // Phone validation removed - accepting any phone format
  if (user_type !== undefined && !['customer', 'admin', 'staff'].includes(user_type)) {
    errors.push('User type must be customer, admin, or staff');
  }
  if (birth_date !== undefined && birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
    errors.push('Birth date must be in YYYY-MM-DD format');
  }
  if (notification_promo !== undefined && typeof notification_promo !== 'boolean') {
    errors.push('Notification promo must be boolean');
  }
  if (notification_orders !== undefined && typeof notification_orders !== 'boolean') {
    errors.push('Notification orders must be boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      message_ar: 'فشل في التحقق من البيانات',
      errors
    });
  }

  next();
};

/**
 * Validate password data
 */
const validatePassword = (req, res, next) => {
  const { password, current_password, new_password } = req.body;
  const errors = [];

  if (req.method === 'POST' && password) {
    // Password creation validation
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }
  }

  if (current_password !== undefined || new_password !== undefined) {
    // Password change validation
    if (!current_password) {
      errors.push('Current password is required');
    }
    if (!new_password) {
      errors.push('New password is required');
    }
    if (new_password && new_password.length < 8) {
      errors.push('New password must be at least 8 characters');
    }
    if (new_password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      errors.push('New password must contain at least one lowercase letter, one uppercase letter, and one number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Password validation failed',
      message_ar: 'فشل في التحقق من كلمة المرور',
      errors
    });
  }

  next();
};

/**
 * Validate admin password change (doesn't require current password)
 */
const validateAdminPasswordChange = (req, res, next) => {
  const { new_password } = req.body;
  const errors = [];

  if (!new_password) {
    errors.push('New password is required');
  }
  if (new_password && new_password.length < 8) {
    errors.push('New password must be at least 8 characters');
  }
  if (new_password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
    errors.push('New password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Password validation failed',
      message_ar: 'فشل في التحقق من كلمة المرور',
      errors
    });
  }

  next();
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if email or phone already exists
 */
const checkDuplicateUser = async (email, phone, excludeUserId = null) => {
  let query = 'SELECT id, email, phone FROM users WHERE (email = ? OR phone = ?)';
  let params = [email, phone];

  if (excludeUserId) {
    query += ' AND id != ?';
    params.push(excludeUserId);
  }

  const [existingUser] = await executeQuery(query, params);
  return existingUser;
};

/**
 * Get user with full details including addresses
 */
const getUserWithDetails = async (userId) => {
  // Get user basic info
  const [user] = await executeQuery(`
    SELECT 
      id, email, phone, first_name, last_name, user_type, avatar, birth_date,
      is_verified, is_active, notification_promo, notification_orders,
      last_login_at, email_verified_at, phone_verified_at, created_at, updated_at
    FROM users 
    WHERE id = ?
  `, [userId]);

  if (!user) return null;

  // Get user addresses
  const addresses = await executeQuery(`
    SELECT 
      ua.id, ua.name, ua.building_no, ua.floor_no, ua.apartment_no, ua.details,
      ua.latitude, ua.longitude, ua.is_default, ua.is_active,
      c.id as city_id, c.title_ar as city_title_ar, c.title_en as city_title_en,
      a.id as area_id, a.title_ar as area_title_ar, a.title_en as area_title_en,
      s.id as street_id, s.title_ar as street_title_ar, s.title_en as street_title_en
    FROM user_addresses ua
    LEFT JOIN cities c ON ua.city_id = c.id
    LEFT JOIN areas a ON ua.area_id = a.id
    LEFT JOIN streets s ON ua.street_id = s.id
    WHERE ua.user_id = ? AND ua.is_active = 1
    ORDER BY ua.is_default DESC, ua.created_at DESC
  `, [userId]);

  // Get user permissions if admin/staff
  let permissions = [];
  if (['admin', 'staff'].includes(user.user_type)) {
    permissions = await executeQuery(`
      SELECT module, can_read, can_create, can_update, can_delete
      FROM admin_permissions 
      WHERE user_id = ?
    `, [userId]);
  }

  return {
    ...user,
    addresses,
    permissions
  };
};

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filters (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, validateUserFilters, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      user_type,
      is_active,
      is_verified,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = [];
    let queryParams = [];

    // Filter by user type
    if (user_type && ['customer', 'admin', 'staff'].includes(user_type)) {
      whereConditions.push('u.user_type = ?');
      queryParams.push(user_type);
    }

    // Filter by active status
    if (is_active !== undefined) {
      whereConditions.push('u.is_active = ?');
      queryParams.push(is_active === 'true' ? 1 : 0);
    }

    // Filter by verification status
    if (is_verified !== undefined) {
      whereConditions.push('u.is_verified = ?');
      queryParams.push(is_verified === 'true' ? 1 : 0);
    }

    // Search filter
    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const validSortColumns = ['created_at', 'first_name', 'last_name', 'email', 'last_login_at'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        u.id, u.email, u.phone, u.first_name, u.last_name, u.user_type, u.avatar,
        u.is_verified, u.is_active, u.last_login_at, u.created_at,
        (SELECT COUNT(*) FROM user_addresses WHERE user_id = u.id AND is_active = 1) as addresses_count,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
      FROM users u
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder}
    `;

    const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: {
        user_type,
        is_active,
        is_verified,
        search
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.get('/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    // Get user counts by type
    const userStats = await executeQuery(`
      SELECT 
        user_type,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
        COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified
      FROM users 
      GROUP BY user_type
    `);

    // Get recent registrations (last 30 days)
    const [recentStats] = await executeQuery(`
      SELECT 
        COUNT(*) as new_users_30_days,
        COUNT(CASE WHEN DATE(created_at) >= CURDATE() - INTERVAL 7 DAY THEN 1 END) as new_users_7_days,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_users_today
      FROM users 
      WHERE created_at >= CURDATE() - INTERVAL 30 DAY
    `);

    // Get daily registrations for the last 30 days
    const dailyRegistrations = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users 
      WHERE created_at >= CURDATE() - INTERVAL 30 DAY
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        user_stats: userStats,
        recent_stats: recentStats,
        daily_registrations: dailyRegistrations
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check permissions: users can view their own profile, admin/staff can view any
    if (req.user.user_type === 'customer' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    const user = await getUserWithDetails(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Remove sensitive info for non-admin users viewing others
    if (req.user.user_type === 'customer' || (req.user.id != userId && req.user.user_type !== 'admin')) {
      delete user.is_active;
      delete user.permissions;
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.post('/', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      user_type = 'customer',
      birth_date,
      avatar,
      is_verified = false,
      is_active = true,
      notification_promo = true,
      notification_orders = true
    } = req.body;

    // Check for duplicate email/phone
    const existingUser = await checkDuplicateUser(email, phone);
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'phone';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
        message_ar: `مستخدم بهذا ${field === 'email' ? 'البريد الإلكتروني' : 'الهاتف'} موجود مسبقاً`
      });
    }

    // Generate default password if none provided (for customer creation from admin)
    const userPassword = password || `temp${Math.random().toString(36).slice(-8)}`;

    // Hash password
    const passwordHash = await bcrypt.hash(userPassword, 12);

    // Create user
    const result = await executeQuery(`
      INSERT INTO users (
        first_name, last_name, email, phone, password_hash, user_type,
        birth_date, avatar, is_verified, is_active, notification_promo, notification_orders,
        email_verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      first_name.trim(),
      last_name.trim(),
      email.toLowerCase(),
      phone || null,
      passwordHash,
      user_type,
      birth_date || null,
      avatar || null,
      is_verified ? 1 : 0,
      is_active ? 1 : 0,
      notification_promo ? 1 : 0,
      notification_orders ? 1 : 0,
      is_verified ? new Date() : null
    ]);

    // Get the created user
    const newUser = await getUserWithDetails(result.insertId);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      message_ar: 'تم إنشاء المستخدم بنجاح',
      data: newUser
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
        message_ar: 'مستخدم بهذا البريد الإلكتروني أو الهاتف موجود مسبقاً'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id', authenticate, validateId, validateUserData, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      user_type,
      birth_date,
      avatar,
      is_verified,
      is_active,
      notification_promo,
      notification_orders
    } = req.body;

    // Check permissions
    const canEdit = (
      req.user.id == userId || // Users can edit their own profile
      req.user.user_type === 'admin' || // Admin can edit anyone
      (req.user.user_type === 'staff' && user_type !== 'admin') // Staff can edit customers and other staff
    );

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Get current user
    const [currentUser] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Check for duplicate email/phone (excluding current user)
    if (email || phone) {
      const existingUser = await checkDuplicateUser(
        email || currentUser.email, 
        phone || currentUser.phone, 
        userId
      );
      if (existingUser) {
        const field = existingUser.email === (email || currentUser.email) ? 'email' : 'phone';
        return res.status(400).json({
          success: false,
          message: `User with this ${field} already exists`,
          message_ar: `مستخدم بهذا ${field === 'email' ? 'البريد الإلكتروني' : 'الهاتف'} موجود مسبقاً`
        });
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateFields = [];
    const updateValues = [];

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name.trim());
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name.trim());
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email.toLowerCase());
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone || null);
    }
    if (birth_date !== undefined) {
      updateFields.push('birth_date = ?');
      updateValues.push(birth_date || null);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateValues.push(avatar || null);
    }
    if (notification_promo !== undefined) {
      updateFields.push('notification_promo = ?');
      updateValues.push(notification_promo ? 1 : 0);
    }
    if (notification_orders !== undefined) {
      updateFields.push('notification_orders = ?');
      updateValues.push(notification_orders ? 1 : 0);
    }

    // Admin/Staff only fields
    if (req.user.user_type === 'admin' || (req.user.user_type === 'staff' && user_type !== 'admin')) {
      if (user_type !== undefined && user_type !== currentUser.user_type) {
        updateFields.push('user_type = ?');
        updateValues.push(user_type);
      }
      if (is_verified !== undefined) {
        updateFields.push('is_verified = ?');
        updateValues.push(is_verified ? 1 : 0);
        if (is_verified && !currentUser.email_verified_at) {
          updateFields.push('email_verified_at = ?');
          updateValues.push(new Date());
        }
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active ? 1 : 0);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        message_ar: 'لا توجد حقول للتحديث'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);

    // Update user
    await executeQuery(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    // Get updated user
    const updatedUser = await getUserWithDetails(userId);

    res.json({
      success: true,
      message: 'User updated successfully',
      message_ar: 'تم تحديث المستخدم بنجاح',
      data: updatedUser
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
        message_ar: 'مستخدم بهذا البريد الإلكتروني أو الهاتف موجود مسبقاً'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/users/:id/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/:id/password', authenticate, validateId, validateAdminPasswordChange, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { current_password, new_password } = req.body;

    // Check permissions
    const canChangePassword = (
      req.user.id == userId || // Users can change their own password
      req.user.user_type === 'admin' // Admin can change anyone's password
    );

    if (!canChangePassword) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Get current user
    const [currentUser] = await executeQuery('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Verify current password only if user is changing their own password
    if (req.user.id == userId && current_password) {
      const isValidPassword = await bcrypt.compare(current_password, currentUser.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          message_ar: 'كلمة المرور الحالية غير صحيحة'
        });
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 12);

    // Update password
    await executeQuery(`
      UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?
    `, [newPasswordHash, userId]);

    res.json({
      success: true,
      message: 'Password updated successfully',
      message_ar: 'تم تحديث كلمة المرور بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete/Deactivate user
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { hard_delete = false } = req.query;

    // Get current user
    const [currentUser] = await executeQuery('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Prevent deleting the last admin
    if (currentUser.user_type === 'admin') {
      const [adminCount] = await executeQuery('SELECT COUNT(*) as count FROM users WHERE user_type = "admin" AND is_active = 1');
      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user',
          message_ar: 'لا يمكن حذف آخر مدير'
        });
      }
    }

    if (hard_delete === 'true') {
      // Hard delete - remove user completely
      const queries = [
        { query: 'DELETE FROM refresh_tokens WHERE user_id = ?', params: [userId] },
        { query: 'DELETE FROM verification_codes WHERE user_id = ?', params: [userId] },
        { query: 'DELETE FROM admin_permissions WHERE user_id = ?', params: [userId] },
        { query: 'DELETE FROM user_addresses WHERE user_id = ?', params: [userId] },
        { query: 'DELETE FROM users WHERE id = ?', params: [userId] }
      ];

      await executeTransaction(queries);

      res.json({
        success: true,
        message: 'User deleted successfully',
        message_ar: 'تم حذف المستخدم بنجاح'
      });
    } else {
      // Soft delete - deactivate user
      await executeQuery(`
        UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?
      `, [userId]);

      res.json({
        success: true,
        message: 'User deactivated successfully',
        message_ar: 'تم إلغاء تفعيل المستخدم بنجاح'
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate/Reactivate user (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.post('/:id/activate', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const [user] = await executeQuery('SELECT id, is_active FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    if (user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'User is already active',
        message_ar: 'المستخدم مفعل مسبقاً'
      });
    }

    // Activate user
    await executeQuery(`
      UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'User activated successfully',
      message_ar: 'تم تفعيل المستخدم بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/users/:id/deactivate
 * @desc    Deactivate user (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.post('/:id/deactivate', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const [user] = await executeQuery('SELECT id, is_active FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'User is already inactive',
        message_ar: 'المستخدم غير مفعل مسبقاً'
      });
    }

    // Deactivate user
    await executeQuery(`
      UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      message_ar: 'تم إلغاء تفعيل المستخدم بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id/orders
 * @desc    Get user's orders (Admin/Staff can view any, users can view their own)
 * @access  Private
 */
router.get('/:id/orders', authenticate, validateId, validatePagination, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 20, status } = req.query;

    // Check permissions
    if (req.user.user_type === 'customer' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Check if user exists
    const [user] = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = ['o.user_id = ?'];
    let queryParams = [userId];

    if (status) {
      whereConditions.push('o.order_status = ?');
      queryParams.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        o.id, o.order_number, o.order_type, o.payment_method, 
        o.payment_status, o.order_status, o.total_amount,
        o.estimated_delivery_time, o.delivered_at, o.created_at,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// LOYALTY POINTS ENDPOINTS
// =============================================================================

/**
 * @route   GET /api/users/:id/loyalty-points
 * @desc    Get user's loyalty points
 * @access  Private
 */
router.get('/:id/loyalty-points', authenticate, validateId, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check permissions: users can view their own points, admin/staff can view any
    if (req.user.user_type === 'customer' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Get or create loyalty points record
    let [loyaltyPoints] = await executeQuery(`
      SELECT * FROM user_loyalty_points WHERE user_id = ?
    `, [userId]);

    if (!loyaltyPoints) {
      // Create initial loyalty points record
      await executeQuery(`
        INSERT INTO user_loyalty_points (user_id, total_points, available_points, lifetime_earned, lifetime_redeemed)
        VALUES (?, 0, 0, 0, 0)
      `, [userId]);

      [loyaltyPoints] = await executeQuery(`
        SELECT * FROM user_loyalty_points WHERE user_id = ?
      `, [userId]);
    }

    res.json({
      success: true,
      data: loyaltyPoints
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id/point-transactions
 * @desc    Get user's point transaction history
 * @access  Private
 */
router.get('/:id/point-transactions', authenticate, validateId, validatePagination, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { 
      page = 1, 
      limit = 20, 
      type,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Check permissions: users can view their own transactions, admin/staff can view any
    if (req.user.user_type === 'customer' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = ['pt.user_id = ?'];
    let queryParams = [userId];

    // Filter by transaction type
    if (type && ['earned', 'redeemed', 'expired', 'bonus'].includes(type)) {
      whereConditions.push('pt.type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort parameters
    const validSortFields = ['created_at', 'points', 'type'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

    const query = `
      SELECT 
        pt.*,
        o.order_number
      FROM point_transactions pt
      LEFT JOIN orders o ON pt.order_id = o.id
      WHERE ${whereClause}
      ORDER BY pt.${sortField} ${sortDirection}
    `;

    const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/users/:id/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/:id/change-password', authenticate, validateId, validatePasswordChange, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { current_password, new_password } = req.body;

    // Check permissions: users can only change their own password
    if (req.user.id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Get current user
    const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(current_password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        message_ar: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await executeQuery(`
      UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?
    `, [hashedPassword, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully',
      message_ar: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// FCM TOKEN ENDPOINTS
// =============================================================================

/**
 * @route   POST /api/users/fcm-token
 * @desc    Register/Update FCM token for push notifications
 * @access  Private
 */
router.post('/fcm-token', authenticate, async (req, res, next) => {
  try {
    const { fcm_token, platform } = req.body;
    const userId = req.user.id;

    if (!fcm_token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
        message_ar: 'رمز FCM مطلوب'
      });
    }

    // Check if token already exists for this user
    const [existingToken] = await executeQuery(`
      SELECT id FROM user_fcm_tokens 
      WHERE user_id = ? AND fcm_token = ?
    `, [userId, fcm_token]);

    if (existingToken) {
      // Update existing token
      await executeQuery(`
        UPDATE user_fcm_tokens 
        SET platform = ?, is_active = 1, updated_at = NOW() 
        WHERE id = ?
      `, [platform || 'unknown', existingToken.id]);
    } else {
      // Deactivate old tokens for this user and platform
      await executeQuery(`
        UPDATE user_fcm_tokens 
        SET is_active = 0 
        WHERE user_id = ? AND platform = ?
      `, [userId, platform || 'unknown']);

      // Insert new token
      await executeQuery(`
        INSERT INTO user_fcm_tokens (user_id, fcm_token, platform, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, NOW(), NOW())
      `, [userId, fcm_token, platform || 'unknown']);
    }

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      message_ar: 'تم تسجيل رمز FCM بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/users/notification-preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notification-preferences', authenticate, async (req, res, next) => {
  try {
    const { fcm_token, promo_notifications, order_notifications } = req.body;
    const userId = req.user.id;

    // Update user notification preferences
    const updateFields = [];
    const updateValues = [];

    if (promo_notifications !== undefined) {
      updateFields.push('notification_promo = ?');
      updateValues.push(promo_notifications ? 1 : 0);
    }

    if (order_notifications !== undefined) {
      updateFields.push('notification_orders = ?');
      updateValues.push(order_notifications ? 1 : 0);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      await executeQuery(`
        UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
      `, updateValues);
    }

    // Update FCM token preferences if provided
    if (fcm_token) {
      await executeQuery(`
        UPDATE user_fcm_tokens 
        SET promo_notifications = ?, order_notifications = ?, updated_at = NOW()
        WHERE user_id = ? AND fcm_token = ? AND is_active = 1
      `, [
        promo_notifications ? 1 : 0,
        order_notifications ? 1 : 0,
        userId,
        fcm_token
      ]);
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      message_ar: 'تم تحديث تفضيلات الإشعارات بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/users/fcm-token
 * @desc    Remove FCM token (on logout)
 * @access  Private
 */
router.delete('/fcm-token', authenticate, async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    if (fcm_token) {
      await executeQuery(`
        UPDATE user_fcm_tokens 
        SET is_active = 0, updated_at = NOW()
        WHERE user_id = ? AND fcm_token = ?
      `, [userId, fcm_token]);
    } else {
      // Deactivate all tokens for this user
      await executeQuery(`
        UPDATE user_fcm_tokens 
        SET is_active = 0, updated_at = NOW()
        WHERE user_id = ?
      `, [userId]);
    }

    res.json({
      success: true,
      message: 'FCM token removed successfully',
      message_ar: 'تم إزالة رمز FCM بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
